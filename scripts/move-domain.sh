#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# joel-academy — move the site from lms.srv1912542.hstgr.cloud to ethioaischool.com
#
#   sudo bash /home/admin/apps/joel-academy-deploy/move-domain.sh --dry-run   # look first
#   sudo bash /home/admin/apps/joel-academy-deploy/move-domain.sh             # do it
#
# ethioaischool.com is on Cloudflare (proxied) and points at this box, where
# LiteSpeed has no vhost for it yet and answers 404. The same shape as
# creator-network's add-ssl.sh for influencerethiopia.com:
#
#   1. add a vhost `ethioaischool`, copied from the lms. vhost (same proxy to
#      127.0.0.1:3050, same acme-challenge context), without the PHP handler,
#      and map the names onto it on every listener that maps lms.
#   2. issue a Let's Encrypt certificate with CyberPanel's acme.sh (HTTP-01,
#      through Cloudflare), install it to /etc/letsencrypt/live/ethioaischool.com
#      and point the vhost at it. acme.sh's cron renews it.
#   3. set ORIGIN=https://ethioaischool.com in the app's .env and restart the
#      service — better-auth, emails, Chapa callbacks, sitemap and JSON-LD all
#      read it.
#   4. turn lms.srv1912542.hstgr.cloud into a 301 to the new domain, except
#      /api/chapa/ (payments started before the move call back there) and
#      /.well-known/.
#
# The https redirect also accepts X-Forwarded-Proto: https, so it cannot loop
# if Cloudflare's SSL mode is Flexible (Cloudflare -> origin over plain http).
#
# www.ethioaischool.com is included only if it resolves; it redirects to the
# bare domain. Every config file and the .env are backed up first and all of
# it is restored automatically unless every check passes, including every
# other hostname on the box answering exactly as before.
# ---------------------------------------------------------------------------
set -euo pipefail

LSWS="/usr/local/lsws"
CONF="${LSWS}/conf/httpd_config.conf"
OLD="lms.srv1912542.hstgr.cloud"
OLD_VHCONF="${LSWS}/conf/vhosts/${OLD}/vhost.conf"
NEW="ethioaischool.com"
NEW_VH="ethioaischool"
NEW_VHDIR="${LSWS}/conf/vhosts/${NEW_VH}"
APP_DIR="/home/admin/apps/joel-academy"
ENV_FILE="${APP_DIR}/.env"
SERVICE="joel-academy"
APP_PORT="3050"
WEBROOT="${LSWS}/Example/html"
CHALLENGE_DIR="${WEBROOT}/.well-known/acme-challenge"
CERT_DIR="/etc/letsencrypt/live/${NEW}"
ACME="/root/.acme.sh/acme.sh"
STAMP="$(date +%Y%m%d-%H%M%S)"
BAK=".bak.move-domain.${STAMP}"

DRY=0
case "${1:-}" in
  "")        ;;
  --dry-run) DRY=1 ;;
  *)         echo "usage: $0 [--dry-run]"; exit 2 ;;
esac

[[ $EUID -eq 0 ]] || { echo "Run me with sudo."; exit 1; }
step() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
die()  { printf '    !! %s\n' "$*"; exit 1; }

WORK="$(mktemp -d)"
PROBE=""
cleanup() { rm -rf "${WORK}"; [[ -n "${PROBE}" ]] && rm -f "${CHALLENGE_DIR}/${PROBE}"; return 0; }
trap cleanup EXIT

# --- config rewriting (python, so a brace inside a value cannot fool it) -----
PY="${WORK}/olsconf.py"
cat > "${PY}" <<'PY'
import re, sys

def is_comment(line):
    return line.lstrip().startswith("#")

def blocks(lines):
    """Top-level `kind [name] {` ... `}` blocks as (start, end) line indexes."""
    out, depth, start, heredoc = [], 0, None, None
    for i, line in enumerate(lines):
        if heredoc:
            if line.strip() == heredoc:
                heredoc = None
            continue
        if is_comment(line):
            continue
        m = re.search(r"<<<\s*(\S+)", line)
        if m:
            heredoc = m.group(1)
            continue
        code = re.sub(r"%\{[^}]*\}", "", line)   # %{Referer}i in log formats
        opens, closes = code.count("{"), code.count("}")
        if depth == 0 and opens:
            start = i
        depth += opens - closes
        if depth < 0:
            sys.exit(f"    !! unbalanced '}}' at line {i + 1}")
        if depth == 0 and start is not None and (opens or closes):
            out.append((start, i))
            start = None
    if depth:
        sys.exit("    !! unbalanced '{' — refusing to edit")
    return out

def header(line):
    m = re.match(r"\s*(\S+)\s*(.*?)\s*\{", line)
    return (m.group(1).lower(), m.group(2)) if m else ("", "")

def map_names(rest):
    return [d.strip() for d in rest.split(",") if d.strip()]

MAP = re.compile(r"^(\s*map\s+)(\S+)\s+(\S.*)$")

def set_rules(lines, rules):
    """Replace the vhost-level rewrite block's rules with `rules`, enabling it."""
    rw = [(s, e) for s, e in blocks(lines) if header(lines[s])[0] == "rewrite"]
    if len(rw) > 1:
        sys.exit(f"    !! {len(rw)} top-level rewrite blocks — refusing to guess")
    new = ["  enable                  1", "  rules                   <<<END_rules", *rules, "  END_rules"]
    if not rw:
        return lines + ["", "rewrite  {", *new, "}"]
    s, e = rw[0]
    return lines[:s + 1] + new + lines[e:]

def check_proxy(lines, what):
    found = {header(lines[s]): (s, e) for s, e in blocks(lines)}
    if ("context", "/.well-known/acme-challenge") not in found:
        sys.exit(f"    !! {what} has no acme-challenge context — certificates could not renew")
    root = found.get(("context", "/"))
    if not root or not re.search(r"^\s*type\s+proxy\s*$", "\n".join(lines[root[0]:root[1] + 1]), re.M):
        sys.exit(f"    !! {what}'s `context /` is not a proxy — is this still the app?")

def https_rules(primary):
    host = re.escape(primary)
    return [
        # One name: www (and anything else mapped here) goes to the bare domain.
        f"RewriteCond %{{HTTP_HOST}} !^{host}$ [NC]",
        f"RewriteRule ^(.*)$ https://{primary}%{{REQUEST_URI}} [R=301,L]",
        # The session cookie is Secure. X-Forwarded-Proto covers Cloudflare's Flexible mode,
        # which reaches us over http for https visitors; without it that would loop.
        "RewriteCond %{HTTPS} !on",
        "RewriteCond %{HTTP:X-Forwarded-Proto} !https",
        f"RewriteRule ^(.*)$ https://{primary}%{{REQUEST_URI}} [R=301,L]",
    ]

def make_vhost(src, dst, src_vh, domains, stamp):
    lines = open(src).read().split("\n")
    check_proxy(lines, src_vh)
    drop = set()
    for s, e in blocks(lines):
        kind, name = header(lines[s])
        body = "\n".join(lines[s:e + 1])
        lsapi = kind == "extprocessor" and re.search(r"^\s*type\s+lsapi\s*$", body, re.M)
        if kind in ("scripthandler", "phpinioverride") or lsapi:
            drop.update(range(s, e + 1))
            print(f"    dropped  {kind} {name}".rstrip())
    lines = [l for i, l in enumerate(lines) if i not in drop]
    if len([1 for s, e in blocks(lines) if header(lines[s])[0] == "vhssl"]) != 1:
        sys.exit("    !! expected one vhssl block in the lms vhost")

    has_domain = has_alias = False
    lines = [l for l in lines if domains[1:] or not re.match(r"^vhAliases\s", l)]
    for i, l in enumerate(lines):
        if re.match(r"^vhDomain\s", l):
            lines[i] = f"vhDomain                  {domains[0]}"; has_domain = True
        elif re.match(r"^vhAliases\s", l):
            lines[i] = f"vhAliases                 {', '.join(domains[1:])}"; has_alias = True
    if not has_domain:
        lines.insert(0, f"vhDomain                  {domains[0]}")
    if not has_alias and domains[1:]:
        lines.insert(1, f"vhAliases                 {', '.join(domains[1:])}")
    lines = set_rules(lines, https_rules(domains[0]))
    check_proxy(lines, "the new vhost")

    for l in lines:
        if src_vh in l and not re.match(r"^\s*(adminEmails|errorlog|accesslog|keyFile|certFile|CACertFile)\b", l):
            print(f"    note: still names {src_vh}: {l.strip()}")
    head = [f"# Generated by joel-academy move-domain.sh {stamp} from vhosts/{src_vh}/vhost.conf.",
            "# CyberPanel does not manage this vhost; edit it by hand.", ""]
    open(dst, "w").write("\n".join(head + lines))

def make_conf(src, dst, src_vh, new_vh, domains):
    lines = open(src).read().split("\n")
    bl = blocks(lines)
    vhosts = {header(lines[s])[1]: (s, e) for s, e in bl if header(lines[s])[0] == "virtualhost"}
    if new_vh in vhosts:
        sys.exit(f"    !! virtualHost {new_vh} already exists — already applied?")
    if src_vh not in vhosts:
        sys.exit(f"    !! no virtualHost {src_vh} — refusing to guess")
    s, e = vhosts[src_vh]
    m = re.search(r"^\s*vhRoot\s+(\S+)", "\n".join(lines[s:e + 1]), re.M)
    if not m:
        sys.exit(f"    !! virtualHost {src_vh} has no vhRoot")
    vh_root = m.group(1).replace("$VH_NAME", src_vh)

    after = {e: ["", f"virtualHost {new_vh} {{",
                 f"  vhRoot                  {vh_root}",
                 "  configFile              $SERVER_ROOT/conf/vhosts/$VH_NAME/vhost.conf",
                 "  allowSymbolLink         1",
                 "  enableScript            1",
                 "  restrained              1",
                 "}"]}
    added = 0
    for s, e in bl:
        kind, name = header(lines[s])
        if kind != "listener":
            continue
        last = None
        for i in range(s + 1, e):
            m = MAP.match(lines[i])
            if not m:
                continue
            if set(map_names(m.group(3))) & set(domains):
                sys.exit(f"    !! listener {name} already maps one of {', '.join(domains)}: {lines[i].strip()}")
            if m.group(2) == src_vh:
                last = i
        if last is not None:
            pad = MAP.match(lines[last]).group(1)
            after.setdefault(last, []).append(f"{pad}{new_vh} {', '.join(domains)}")
            print(f"    listener {name}: + {new_vh} {', '.join(domains)}")
            added += 1
    if not added:
        sys.exit(f"    !! no listener maps {src_vh} — nothing to copy the mapping from")

    out = []
    for i, l in enumerate(lines):
        out.append(l)
        out.extend(after.get(i, []))
    open(dst, "w").write("\n".join(out))
    print(f"    virtualHost {new_vh} added after {src_vh} (vhRoot {vh_root})")

def set_cert(path, cert_dir):
    lines = open(path).read().split("\n")
    v = [(s, e) for s, e in blocks(lines) if header(lines[s])[0] == "vhssl"]
    if len(v) != 1:
        sys.exit(f"    !! expected one vhssl block in {path}")
    s, e = v[0]
    for i in range(s, e + 1):
        lines[i] = re.sub(r"^(\s*keyFile\s+)\S+",  rf"\g<1>{cert_dir}/privkey.pem",   lines[i])
        lines[i] = re.sub(r"^(\s*certFile\s+)\S+", rf"\g<1>{cert_dir}/fullchain.pem", lines[i])
    open(path, "w").write("\n".join(lines))

def redirect_old(src, dst, old, new):
    lines = open(src).read().split("\n")
    check_proxy(lines, old)
    # The proxy stays: it still serves what the first condition lets through.
    lines = set_rules(lines, [
        "RewriteCond %{REQUEST_URI} !^/(\\.well-known|api/chapa)/",
        f"RewriteRule ^(.*)$ https://{new}%{{REQUEST_URI}} [R=301,L]",
    ])
    open(dst, "w").write("\n".join(lines))

def set_origin(src, dst, origin):
    text = open(src).read()
    new, n = re.subn(r"(?m)^ORIGIN=.*$", f"ORIGIN={origin}", text)
    if n != 1:
        sys.exit(f"    !! expected one ORIGIN= line in {src}, found {n}")
    open(dst, "w").write(new)

def hosts(src, skip):
    lines = open(src).read().split("\n")
    seen = []
    for s, e in blocks(lines):
        if header(lines[s])[0] != "listener":
            continue
        for i in range(s + 1, e):
            m = MAP.match(lines[i])
            for d in map_names(m.group(3)) if m else []:
                if "*" not in d and d not in skip and d not in seen:
                    seen.append(d)
    print("\n".join(seen))

cmd, *a = sys.argv[1:]
if cmd == "vhost":
    make_vhost(a[0], a[1], a[2], a[3].split(","), a[4])
elif cmd == "conf":
    make_conf(a[0], a[1], a[2], a[3], a[4].split(","))
elif cmd == "cert":
    set_cert(a[0], a[1])
elif cmd == "redirect":
    redirect_old(a[0], a[1], a[2], a[3])
elif cmd == "origin":
    set_origin(a[0], a[1], a[2])
elif cmd == "hosts":
    hosts(a[0], a[1].split(","))
PY

# Loopback with SNI, so checks never depend on Cloudflare unless they mean to.
probe() {   # scheme host path [curl options...] -> "code location"
  local sch="$1" h="$2" p="$3" port=443; shift 3
  [[ "${sch}" == http ]] && port=80
  curl -s --max-time 20 "$@" --resolve "${h}:${port}:127.0.0.1" \
       -o /dev/null -w '%{http_code} %{redirect_url}' "${sch}://${h}${p}" 2>/dev/null || echo "000 "
}
code_of() { probe "$@" | cut -d' ' -f1; }

# --- 1. pre-flight: nothing is changed here --------------------------------
step "Pre-flight (changes nothing)"
[[ -x "${ACME}" ]]        || die "acme.sh not found at ${ACME} — CyberPanel normally installs it there"
[[ -r "${CONF}" ]]        || die "cannot read ${CONF}"
[[ -r "${OLD_VHCONF}" ]]  || die "cannot read ${OLD_VHCONF}"
[[ -r "${ENV_FILE}" ]]    || die "cannot read ${ENV_FILE}"
[[ ! -e "${NEW_VHDIR}" ]] || die "${NEW_VHDIR} already exists — already applied? (rollback is printed at the end of that run)"
echo "    acme.sh: $("${ACME}" --version 2>/dev/null | tail -1)"
echo "    current $(grep -E '^ORIGIN=' "${ENV_FILE}")"

# Ask public DNS, as Let's Encrypt does. This box's resolver has a `localhost` search domain, so
# getent turns a name with no record into <name>.localhost and answers 127.0.0.1.
public_a() { dig +short +time=5 +tries=2 A "$1" @1.1.1.1 2>/dev/null | grep -E '^[0-9.]+$' | head -1 || true; }
ip="$(public_a "${NEW}")"
[[ -n "${ip}" ]] || die "${NEW} does not resolve in public DNS"
echo "    ${NEW} resolves (${ip})"
DOMAINS=("${NEW}")
ip="$(public_a "www.${NEW}")"
if [[ -n "${ip}" ]]; then
  DOMAINS+=("www.${NEW}"); echo "    www.${NEW} resolves (${ip}) — included"
else
  echo "    www.${NEW} does not resolve — left out (add a proxied CNAME www -> ${NEW} in Cloudflare and re-issue later)"
fi
DLIST="$(IFS=,; echo "${DOMAINS[*]}")"

if crontab -l 2>/dev/null | grep -q 'acme\.sh.*--cron'; then CRON_OK=1; echo "    renewal cron: present"
else CRON_OK=0; echo "    renewal cron: MISSING — will install it (acme.sh --install-cronjob)"; fi

[[ "$(curl -s --max-time 5 "http://127.0.0.1:${APP_PORT}/health/ready")" == *'"status":"ok"'* ]] \
  || die "the app is not healthy on 127.0.0.1:${APP_PORT} — fix that first"
echo "    app healthy on 127.0.0.1:${APP_PORT}"

step "Building the new config (in ${WORK})"
cp -a "${CONF}" "${WORK}/httpd_config.conf.orig"
cp -a "${OLD_VHCONF}" "${WORK}/old-vhost.conf.orig"
python3 "${PY}" vhost    "${OLD_VHCONF}" "${WORK}/vhost.conf" "${OLD}" "${DLIST}" "${STAMP}"
python3 "${PY}" conf     "${WORK}/httpd_config.conf.orig" "${WORK}/httpd_config.conf" "${OLD}" "${NEW_VH}" "${DLIST}"
python3 "${PY}" redirect "${OLD_VHCONF}" "${WORK}/old-vhost.conf" "${OLD}" "${NEW}"
python3 "${PY}" origin   "${ENV_FILE}" "${WORK}/env" "https://${NEW}"

mapfile -t OTHERS < <(python3 "${PY}" hosts "${CONF}" "${DLIST},${OLD}")
declare -A BEFORE
for h in "${OTHERS[@]}"; do BEFORE["$h"]="$(code_of https "$h" / -k)"; done
echo "    recorded current status of ${#OTHERS[@]} other hostname(s)"

if [[ ${DRY} -eq 1 ]]; then
  step "Dry run — httpd_config.conf would change like this"
  diff -u "${CONF}" "${WORK}/httpd_config.conf" | sed 's/^/    /' || true
  step "Dry run — new ${NEW_VHDIR}/vhost.conf, against ${OLD}'s"
  diff -u "${OLD_VHCONF}" "${WORK}/vhost.conf" | sed 's/^/    /' || true
  step "Dry run — ${OLD}'s vhost would become a redirect"
  diff -u "${OLD_VHCONF}" "${WORK}/old-vhost.conf" | sed 's/^/    /' || true
  step "Dry run — .env"
  diff -u <(grep '^ORIGIN=' "${ENV_FILE}") <(grep '^ORIGIN=' "${WORK}/env") | sed 's/^/    /' || true
  step "Dry run — the certificate would be issued with"
  echo "    ${ACME} --issue --server letsencrypt -k 2048 -w ${WEBROOT} $(printf -- '-d %s ' "${DOMAINS[@]}")"
  printf '\n\033[1;32mPre-flight passed.\033[0m Nothing was changed. Run again without --dry-run to apply.\n'
  exit 0
fi

# --- rollback: everything this script touches --------------------------------
ENV_CHANGED=0
restore() {
  echo
  echo "    !! $1 — restoring the previous config"
  [[ -f "${CONF}${BAK}" ]]       && cat "${CONF}${BAK}" > "${CONF}"
  [[ -f "${OLD_VHCONF}${BAK}" ]] && cat "${OLD_VHCONF}${BAK}" > "${OLD_VHCONF}"
  [[ -d "${NEW_VHDIR}" ]]        && mv "${NEW_VHDIR}" "${NEW_VHDIR}.failed.${STAMP}"
  if [[ ${ENV_CHANGED} -eq 1 ]]; then
    cat "${ENV_FILE}${BAK}" > "${ENV_FILE}"
    systemctl restart "${SERVICE}"
  fi
  "${LSWS}/bin/lswsctrl" restart >/dev/null 2>&1 || true
  sleep 5
  echo "    restored. https://${OLD}/health/ready now: $(code_of https "${OLD}" /health/ready -k)"
  [[ -d "${NEW_VHDIR}.failed.${STAMP}" ]] && echo "    the failed vhost is kept at ${NEW_VHDIR}.failed.${STAMP}"
  echo "    OpenLiteSpeed error log: tail -50 ${LSWS}/logs/error.log"
  exit 1
}
lsws_restart() { "${LSWS}/bin/lswsctrl" restart >/dev/null 2>&1 || true; sleep 5; }

# --- 2. new vhost, on the lms certificate for now ----------------------------
step "Installing the ${NEW_VH} vhost"
cmp -s "${CONF}" "${WORK}/httpd_config.conf.orig" || die "${CONF} changed while this ran — re-run. Nothing has changed."
cp -a "${CONF}" "${CONF}${BAK}"
cp -a "${OLD_VHCONF}" "${OLD_VHCONF}${BAK}"
cp -a "${ENV_FILE}" "${ENV_FILE}${BAK}"
echo "    backups: ${CONF}${BAK}"
echo "             ${OLD_VHCONF}${BAK}"
echo "             ${ENV_FILE}${BAK}"
install -d "${NEW_VHDIR}"
chown --reference="${LSWS}/conf/vhosts/${OLD}" "${NEW_VHDIR}"
chmod --reference="${LSWS}/conf/vhosts/${OLD}" "${NEW_VHDIR}"
cp "${WORK}/vhost.conf" "${NEW_VHDIR}/vhost.conf"
chown --reference="${OLD_VHCONF}" "${NEW_VHDIR}/vhost.conf"
chmod --reference="${OLD_VHCONF}" "${NEW_VHDIR}/vhost.conf"
cat "${WORK}/httpd_config.conf" > "${CONF}"     # keeps the file's owner and mode
lsws_restart

r="$(curl -sk --max-time 20 --resolve "${NEW}:443:127.0.0.1" "https://${NEW}/health/ready" || true)"
[[ "${r}" == *'"status":"ok"'* ]] || restore "https://${NEW}/health/ready over loopback is not the app: ${r:0:120}"
echo "    https://${NEW}/health/ready  ok (loopback)"
r="$(probe http "${NEW}" /login)"
[[ "${r}" == "301 https://${NEW}/login" ]] || restore "http://${NEW}/login should 301 to https, got: ${r}"
echo "    http  -> https               ${r}"
r="$(code_of http "${NEW}" /health/ready -H 'X-Forwarded-Proto: https')"
[[ "${r}" == 200 ]] || restore "http with X-Forwarded-Proto: https should be served, not redirected (got ${r}) — Cloudflare Flexible would loop"
echo "    http + X-Forwarded-Proto      200 (no loop under Cloudflare Flexible)"

# Let's Encrypt fetches http://<name>/.well-known/acme-challenge/<token> through Cloudflare
# and follows redirects. Serve a token of our own the same way first: a failed validation
# counts against Let's Encrypt's hourly limit.
install -d -m 755 "${CHALLENGE_DIR}"
PROBE="move-domain-probe-$(openssl rand -hex 8)"
printf '%s' "${PROBE}" > "${CHALLENGE_DIR}/${PROBE}"
chmod 644 "${CHALLENGE_DIR}/${PROBE}"
for d in "${DOMAINS[@]}"; do
  body="$(curl -sL --max-time 20 "http://${d}/.well-known/acme-challenge/${PROBE}" 2>/dev/null || true)"
  [[ "${body}" == "${PROBE}" ]] || restore "http://${d}/.well-known/acme-challenge/ does not reach ${CHALLENGE_DIR} through Cloudflare"
  echo "    ${d}: challenge path reachable through Cloudflare"
done
rm -f "${CHALLENGE_DIR}/${PROBE}"; PROBE=""

# --- 3. certificate ---------------------------------------------------------
step "Issuing the certificate (Let's Encrypt, HTTP-01)"
issue=(--issue --server letsencrypt -k 2048 -w "${WEBROOT}")
for d in "${DOMAINS[@]}"; do issue+=(-d "${d}"); done
rc=0; "${ACME}" "${issue[@]}" 2>&1 | sed 's/^/    /' || rc=${PIPESTATUS[0]}
case ${rc} in
  0) ;;
  2) echo "    already issued and still valid — reusing it" ;;
  *) restore "acme.sh exit ${rc} (log: /root/.acme.sh/acme.sh.log)" ;;
esac

install -d -m 755 "${CERT_DIR}"
"${ACME}" --install-cert -d "${NEW}" \
  --key-file       "${CERT_DIR}/privkey.pem" \
  --fullchain-file "${CERT_DIR}/fullchain.pem" \
  --cert-file      "${CERT_DIR}/cert.pem" \
  --reloadcmd      "${LSWS}/bin/lswsctrl restart" 2>&1 | sed 's/^/    /'
REF_CERT_DIR="/etc/letsencrypt/live/srv1912542.hstgr.cloud"
if [[ -d "${REF_CERT_DIR}" ]]; then   # same owner and mode as CyberPanel's own
  chown --reference="${REF_CERT_DIR}" "${CERT_DIR}"
  for f in privkey fullchain cert; do
    [[ -e "${REF_CERT_DIR}/${f}.pem" ]] || continue
    chown --reference="${REF_CERT_DIR}/${f}.pem" "${CERT_DIR}/${f}.pem"
    chmod --reference="${REF_CERT_DIR}/${f}.pem" "${CERT_DIR}/${f}.pem"
  done
fi
san="$(openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -ext subjectAltName 2>/dev/null | tail -1)"
for d in "${DOMAINS[@]}"; do
  [[ "${san}" == *"DNS:${d}"* ]] || restore "the installed certificate does not name ${d} (${san})"
done
echo "    $(openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -enddate) — ${san// /}"
[[ ${CRON_OK} -eq 1 ]] || "${ACME}" --install-cronjob 2>&1 | sed 's/^/    /'

python3 "${PY}" cert "${NEW_VHDIR}/vhost.conf" "${CERT_DIR}"
lsws_restart
for d in "${DOMAINS[@]}"; do
  c="$(code_of https "${d}" /health/ready)"   # no -k: passes only with a certificate naming it
  [[ "${c}" =~ ^(200|301)$ ]] || restore "https://${d}/ did not verify with its own certificate (${c}; 000 = rejected)"
  printf '    %-28s %s certificate verified\n' "${d}" "${c}"
done

# --- 4. the app's ORIGIN ------------------------------------------------------
step "ORIGIN=https://${NEW}"
cat "${WORK}/env" > "${ENV_FILE}"     # keeps admin's ownership and 600
ENV_CHANGED=1
systemctl restart "${SERVICE}"
ok=0
for i in $(seq 1 15); do
  sleep 2
  [[ "$(curl -s --max-time 5 "http://127.0.0.1:${APP_PORT}/health/ready")" == *'"status":"ok"'* ]] && { ok=1; break; }
done
[[ ${ok} -eq 1 ]] || restore "${SERVICE} did not come back healthy: $(journalctl -u "${SERVICE}" -n 5 --no-pager | tail -5)"
echo "    ${SERVICE} restarted and healthy"

# --- 5. old domain -> new ------------------------------------------------------
step "${OLD} -> https://${NEW}"
cat "${WORK}/old-vhost.conf" > "${OLD_VHCONF}"
lsws_restart
r="$(probe https "${OLD}" '/courses?x=1' -k)"
[[ "${r}" == "301 https://${NEW}/courses?x=1" ]] || restore "https://${OLD}/courses should 301 to the new domain, got: ${r}"
echo "    https://${OLD}/courses?x=1  ${r}"
r="$(probe http "${OLD}" /login)"
[[ "${r}" == "301 https://${NEW}/login" ]] || restore "http://${OLD}/login should 301 to the new domain, got: ${r}"
echo "    http://${OLD}/login         ${r}"
r="$(code_of https "${OLD}" /api/chapa/webhook -k)"
[[ "${r}" != 301 && "${r}" != 000 ]] || restore "https://${OLD}/api/chapa/webhook should still reach the app, got: ${r}"
echo "    https://${OLD}/api/chapa/webhook  ${r} (still reaches the app)"

# --- 6. verify ---------------------------------------------------------------
step "Verifying"
changed=()
for h in "${OTHERS[@]}"; do
  now="$(code_of https "$h" / -k)"
  [[ "${now}" == "${BEFORE[$h]}" ]] || { sleep 3; now="$(code_of https "$h" / -k)"; }   # one retry for a slow site
  [[ "${now}" == "${BEFORE[$h]}" ]] || changed+=("${h}: ${BEFORE[$h]} -> ${now}")
done
if [[ ${#changed[@]} -gt 0 ]]; then
  printf '    changed: %s\n' "${changed[@]}"
  restore "${#changed[@]} other hostname(s) answer differently"
fi
echo "    ${#OTHERS[@]} other hostname(s) answer exactly as before"

# And the way visitors arrive: through Cloudflare.
for p in /health/ready / /courses /login; do
  c="$(curl -s -o /dev/null --max-time 20 -w '%{http_code}' "https://${NEW}${p}" || true)"
  printf '    https://%s%-14s %s (via Cloudflare)\n' "${NEW}" "${p}" "${c:-000}"
  [[ "${c}" == 200 ]] || restore "https://${NEW}${p} answers ${c:-000} through Cloudflare"
done

printf '\n\033[1;32mDone.\033[0m  https://%s/\n\n' "${NEW}"
echo "Renewal:   acme.sh renews it ~30 days before expiry and restarts LiteSpeed ('${ACME} --list')."
echo "Next:      Cloudflare -> SSL/TLS -> Overview -> Full (strict)."
echo "Rollback:  cat ${CONF}${BAK} > ${CONF} && cat ${OLD_VHCONF}${BAK} > ${OLD_VHCONF} \\"
echo "             && mv ${NEW_VHDIR} ${NEW_VHDIR}.off && cat ${ENV_FILE}${BAK} > ${ENV_FILE} \\"
echo "             && systemctl restart ${SERVICE} && ${LSWS}/bin/lswsctrl restart"
