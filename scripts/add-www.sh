#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# joel-academy — add www.ethioaischool.com to the site's certificate
#
#   sudo bash /home/admin/apps/joel-academy-deploy/add-www.sh
#
# move-domain.sh ran while www had no DNS record, so the certificate names only
# ethioaischool.com. LiteSpeed already answers www on the `ethioaischool` vhost
# (its rewrite sends every other host to the bare domain), but with that
# certificate Cloudflare's Full (strict) mode would refuse www with a 526.
#
#   1. make sure www is an alias of the vhost and mapped on every listener that
#      maps the vhost (both are skipped when already there)
#   2. re-issue the certificate for both names (HTTP-01 through Cloudflare) into
#      the same /etc/letsencrypt/live/ethioaischool.com, which the vhost already
#      uses; acme.sh renews both names from then on
#
# The config is backed up first and restored if www's path for Let's Encrypt
# does not work. If issuing fails, the old certificate stays in place.
# ---------------------------------------------------------------------------
set -euo pipefail

LSWS="/usr/local/lsws"
CONF="${LSWS}/conf/httpd_config.conf"
NEW="ethioaischool.com"
WWW="www.${NEW}"
VH="ethioaischool"
VHCONF="${LSWS}/conf/vhosts/${VH}/vhost.conf"
WEBROOT="${LSWS}/Example/html"
CHALLENGE_DIR="${WEBROOT}/.well-known/acme-challenge"
CERT_DIR="/etc/letsencrypt/live/${NEW}"
ACME="/root/.acme.sh/acme.sh"
BAK=".bak.add-www.$(date +%Y%m%d-%H%M%S)"

[[ $EUID -eq 0 ]] || { echo "Run me with sudo."; exit 1; }
step() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
die()  { printf '    !! %s\n' "$*"; exit 1; }

PROBE=""
trap '[[ -n "${PROBE}" ]] && rm -f "${CHALLENGE_DIR}/${PROBE}"; true' EXIT

step "Pre-flight (changes nothing)"
[[ -x "${ACME}" && -f "${VHCONF}" && -f "${CERT_DIR}/fullchain.pem" ]] || die "expected ${ACME}, ${VHCONF} and ${CERT_DIR} — has move-domain.sh run?"
# Public DNS, as Let's Encrypt sees it (this box's resolver answers 127.0.0.1 for missing names).
ip="$(dig +short +time=5 +tries=2 A "${WWW}" @1.1.1.1 2>/dev/null | grep -E '^[0-9.]+$' | head -1 || true)"
[[ -n "${ip}" ]] || die "${WWW} does not resolve in public DNS yet"
echo "    ${WWW} resolves (${ip})"
san="$(openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -ext subjectAltName | tail -1)"
echo "    current certificate: ${san// /}"

step "vhost alias and listener maps"
cp -a "${CONF}" "${CONF}${BAK}"
cp -a "${VHCONF}" "${VHCONF}${BAK}"
python3 - "${CONF}" "${VHCONF}" "${VH}" "${WWW}" <<'PY'
import re, sys
conf, vhconf, vh, www = sys.argv[1:]

lines = open(conf).read().split("\n")
hits = 0
for i, l in enumerate(lines):
    m = re.match(rf"^(\s*map\s+{re.escape(vh)}\s+)(\S.*)$", l)
    if not m:
        continue
    hits += 1
    names = [d.strip() for d in m.group(2).split(",") if d.strip()]
    if www not in names:
        lines[i] = m.group(1) + ", ".join(names + [www])
        print(f"    map line {i + 1}: + {www}")
if not hits:
    sys.exit(f"    !! no `map {vh} ...` line in {conf}")
open(conf, "w").write("\n".join(lines))   # write in place: keeps owner and mode

v = open(vhconf).read().split("\n")
a = [i for i, l in enumerate(v) if re.match(r"^vhAliases\s", l)]
if a:
    names = [d.strip() for d in re.sub(r"^vhAliases\s+", "", v[a[0]]).split(",") if d.strip()]
    if www not in names:
        v[a[0]] = "vhAliases                 " + ", ".join(names + [www])
        print(f"    vhAliases: + {www}")
else:
    d = [i for i, l in enumerate(v) if re.match(r"^vhDomain\s", l)]
    v.insert(d[0] + 1 if d else 0, f"vhAliases                 {www}")
    print(f"    vhAliases {www} added")
open(vhconf, "w").write("\n".join(v))
PY
"${LSWS}/bin/lswsctrl" restart >/dev/null 2>&1 || true
sleep 5

restore() {
  echo "    !! $1 — restoring the previous config"
  cat "${CONF}${BAK}" > "${CONF}"
  cat "${VHCONF}${BAK}" > "${VHCONF}"
  "${LSWS}/bin/lswsctrl" restart >/dev/null 2>&1 || true
  exit 1
}

# Let's Encrypt fetches http://www.../.well-known/acme-challenge/<token> through Cloudflare and
# follows the redirect to the bare domain. Try a token of our own first: failures count against
# Let's Encrypt's limits.
install -d -m 755 "${CHALLENGE_DIR}"
PROBE="add-www-probe-$(openssl rand -hex 8)"
printf '%s' "${PROBE}" > "${CHALLENGE_DIR}/${PROBE}"
chmod 644 "${CHALLENGE_DIR}/${PROBE}"
for d in "${NEW}" "${WWW}"; do
  body="$(curl -sL --max-time 20 "http://${d}/.well-known/acme-challenge/${PROBE}" 2>/dev/null || true)"
  [[ "${body}" == "${PROBE}" ]] || restore "http://${d}/.well-known/acme-challenge/ does not reach ${CHALLENGE_DIR} through Cloudflare"
  echo "    ${d}: challenge path reachable through Cloudflare"
done
rm -f "${CHALLENGE_DIR}/${PROBE}"; PROBE=""

step "Re-issuing the certificate for ${NEW} + ${WWW}"
# --force: the existing order for ${NEW} alone is not due for renewal, and the name list changed.
rc=0; "${ACME}" --issue --force --server letsencrypt -k 2048 -w "${WEBROOT}" -d "${NEW}" -d "${WWW}" 2>&1 | sed 's/^/    /' || rc=${PIPESTATUS[0]}
[[ ${rc} -eq 0 ]] || die "acme.sh exit ${rc} (log: /root/.acme.sh/acme.sh.log). The old certificate is still in place; the site is unaffected."

ref="${CERT_DIR}/privkey.pem${BAK}"
cp -a "${CERT_DIR}/privkey.pem" "${ref}"
"${ACME}" --install-cert -d "${NEW}" \
  --key-file       "${CERT_DIR}/privkey.pem" \
  --fullchain-file "${CERT_DIR}/fullchain.pem" \
  --cert-file      "${CERT_DIR}/cert.pem" \
  --reloadcmd      "${LSWS}/bin/lswsctrl restart" 2>&1 | sed 's/^/    /'
for f in privkey fullchain cert; do   # same owner and mode as before
  chown --reference="${ref}" "${CERT_DIR}/${f}.pem"
  chmod --reference="${ref}" "${CERT_DIR}/${f}.pem"
done
rm -f "${ref}"
sleep 5

step "Verifying"
san="$(openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -ext subjectAltName | tail -1)"
echo "    certificate: ${san// /}, $(openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -enddate)"
fail=0
for d in "${NEW}" "${WWW}"; do
  # No -k: passes only if LiteSpeed presents a certificate naming it.
  r="$(curl -s --max-time 20 --resolve "${d}:443:127.0.0.1" -o /dev/null -w '%{http_code} %{redirect_url}' "https://${d}/courses" || echo "000")"
  printf '    https://%-24s %s\n' "${d}/courses" "${r}"
  case "${d}:${r}" in
    "${NEW}:200 "|"${WWW}:301 https://${NEW}/courses") ;;
    *) fail=1 ;;
  esac
done
[[ ${fail} -eq 0 ]] || die "unexpected answer above. Config backups: ${CONF}${BAK}, ${VHCONF}${BAK}"

printf '\n\033[1;32mDone.\033[0m  %s and %s share one certificate; www redirects to %s.\n' "${NEW}" "${WWW}" "${NEW}"
echo "Cloudflare can now be on Full (strict)."
