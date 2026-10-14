#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# joel-academy — privileged setup on srv1912542.hstgr.cloud
#
# Run once:   sudo bash /home/admin/apps/joel-academy-deploy/root-setup.sh
#
# The same four steps as alpha-steel's, each idempotent:
#   1. MariaDB        — creates the `joel_academy` database + `joelacademy` user
#                       (the password is read from the app's .env; this file
#                       holds no secret) and imports joel_academy-dump.sql, a
#                       mariadb-dump of the laptop's database: schema, the
#                       drizzle migration log and the catalogue
#   2. systemd        — installs and starts joel-academy.service (runs as admin)
#   3. CyberPanel     — lms.srv1912542.hstgr.cloud already exists with its
#                       certificate, so this only checks for them
#   4. OpenLiteSpeed  — repoints the lms. vhost at 127.0.0.1:3050. It used to
#                       proxy to the Next.js LMS (:3001) and its NestJS API
#                       (:4000); those proxy contexts and [P] rewrite rules are
#                       removed (and printed), and the file is backed up first.
#                       Those two processes belong to another user and are left
#                       running — only the domain stops reaching them.
#
# Nothing outside those four areas is touched. If the site does not answer
# afterwards, the OpenLiteSpeed config is restored automatically. To go back
# to the Next.js LMS by hand later:
#   cp -a <vhost.conf>.bak.joel-academy.<ts> <vhost.conf> && /usr/local/lsws/bin/lswsctrl restart
# Later schema changes go through `npm run db:migrate:remote` from the laptop.
# ---------------------------------------------------------------------------
set -euo pipefail

MASTER="srv1912542.hstgr.cloud"
DOMAIN="lms.${MASTER}"
APP_DIR="/home/admin/apps/joel-academy"
DEPLOY_DIR="/home/admin/apps/joel-academy-deploy"
APP_USER="admin"
APP_PORT="3050"
SERVICE="joel-academy"
DB_NAME="joel_academy"
DB_USER="joelacademy"
LSWS="/usr/local/lsws"
VHCONF="${LSWS}/conf/vhosts/${DOMAIN}/vhost.conf"
CONF="${LSWS}/conf/httpd_config.conf"
TS="$(date +%Y%m%d-%H%M%S)"

[[ $EUID -eq 0 ]] || { echo "Run me with sudo."; exit 1; }
[[ -f "${APP_DIR}/.env" ]]             || { echo "!! ${APP_DIR}/.env is missing"; exit 1; }
[[ -f "${APP_DIR}/build/handler.js" ]] || { echo "!! ${APP_DIR}/build has not been shipped yet"; exit 1; }
[[ -f "${APP_DIR}/server.js" ]]        || { echo "!! ${APP_DIR}/server.js is missing"; exit 1; }

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

# The password lives in the app's .env only. Read it from there rather than
# keeping a second copy here.
DB_PASS="$(sed -n 's/^DATABASE_URL=//p' "${APP_DIR}/.env" | tr -d '"' | sed 's|.*mysql://[^:]*:||;s|@.*||')"
[[ -n "${DB_PASS}" ]] || { echo "!! could not read the database password from ${APP_DIR}/.env"; exit 1; }

# ---------------------------------------------------------------------------
step "1/4  MariaDB: database and user"
# ---------------------------------------------------------------------------
mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
echo "    database + user ready"

DUMP="${DEPLOY_DIR}/joel_academy-dump.sql"
if mysql -N -B "${DB_NAME}" -e 'SHOW TABLES LIKE "__drizzle_migrations"' | grep -q .; then
  echo "    ${DB_NAME} already has tables — not importing the dump over them"
elif [[ -f "${DUMP}" ]]; then
  mysql "${DB_NAME}" < "${DUMP}"
  echo "    imported ${DUMP}: $(mysql -N -B -e 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema="'"${DB_NAME}"'"') tables, $(mysql -N -B "${DB_NAME}" -e 'SELECT COUNT(*) FROM course') courses"
else
  echo "    !! ${DUMP} not found — the app will start against an empty database"
fi

# ---------------------------------------------------------------------------
step "2/4  systemd: ${SERVICE}.service"
# ---------------------------------------------------------------------------
NODE_BIN="$(sudo -u "${APP_USER}" bash -lc 'command -v node')"
echo "    node: ${NODE_BIN} ($(${NODE_BIN} -v))"
install -d -o "${APP_USER}" -g "${APP_USER}" "${APP_DIR}/files"

cat > "/etc/systemd/system/${SERVICE}.service" <<UNIT
[Unit]
Description=${SERVICE} — Joel Talargie Academy (SvelteKit / adapter-node)
After=network-online.target mariadb.service
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=${NODE_BIN} ${APP_DIR}/server.js
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE}

# Hardening — the app only reads its own directory and writes uploads (FILES_DIR: receipts,
# course images, lesson files).
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=read-only
ReadWritePaths=${APP_DIR}/files

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now "${SERVICE}.service"
systemctl restart "${SERVICE}.service"
sleep 4
if curl -sf --max-time 5 "http://127.0.0.1:${APP_PORT}/health/ready" | grep -q '"status":"ok"'; then
  echo "    service active — /health/ready answers on 127.0.0.1:${APP_PORT}"
else
  echo "    !! service is not healthy:"; journalctl -u "${SERVICE}" -n 30 --no-pager; exit 1
fi

# ---------------------------------------------------------------------------
step "3/4  CyberPanel: child domain ${DOMAIN} + Let's Encrypt"
# ---------------------------------------------------------------------------
[[ -f "${VHCONF}" ]] || { echo "    !! ${VHCONF} is missing — expected ${DOMAIN} to exist already"; exit 1; }
echo "    ${DOMAIN} exists"
if [[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  echo "    certificate present (expires $(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" | cut -d= -f2))"
else
  cyberpanel issueSSL --domainName "${DOMAIN}" || true
fi

# ---------------------------------------------------------------------------
step "4/4  OpenLiteSpeed: proxy ${DOMAIN} → 127.0.0.1:${APP_PORT}"
# ---------------------------------------------------------------------------
cp -a "${VHCONF}" "${VHCONF}.bak.${SERVICE}.${TS}"
cp -a "${CONF}"   "${CONF}.bak.${SERVICE}.${TS}"
echo "    backed up ${VHCONF} and ${CONF} (.bak.${SERVICE}.${TS})"

python3 - "${VHCONF}" "${DOMAIN}" "${APP_PORT}" <<'PY'
import re, sys
path, domain, port = sys.argv[1], sys.argv[2], sys.argv[3]
lines = open(path).read().split("\n")

# Top-level blocks, brace-matched. Rewrite rules sit in `<<<END_x … END_x` heredocs whose
# %{VAR} braces are text, not structure, so heredoc lines are not counted.
blocks, depth, start, heredoc = [], 0, None, None
for i, line in enumerate(lines):
    s = line.strip()
    if heredoc:
        if s == heredoc: heredoc = None
        continue
    m = re.search(r"<<<(\w+)\s*$", s)
    if m: heredoc = m.group(1); continue
    if s.endswith("{"):
        if depth == 0: start = i
        depth += 1
    elif s == "}" and depth:
        depth -= 1
        if depth == 0: blocks.append((start, i))

def header(b): return lines[b[0]].strip()[:-1].split()
def body(b): return "\n".join(lines[b[0]:b[1] + 1])

drop, removed = set(), []
for b in blocks:
    h = header(b)
    if h[0] == "context" and len(h) > 1 and h[1] != "/.well-known/acme-challenge":
        text = body(b)
        # Every proxy context goes (the old app's / and /api), and `context /` whatever its type,
        # since ours replaces it.
        if h[1] == "/" or re.search(r"^\s*type\s+proxy\b", text, re.M):
            drop.update(range(b[0], b[1] + 1)); removed.append(text)
    elif h[0] == "extprocessor" and len(h) > 1 and h[1] == "joelacademy":
        drop.update(range(b[0], b[1] + 1))  # re-added below with the current port

# Proxying rewrite rules ([P]) inside the vhost's rewrite block would bypass the contexts.
for b in blocks:
    if header(b)[0] == "rewrite":
        for i in range(b[0], b[1] + 1):
            if re.search(r"^\s*RewriteRule\b.*\[[^\]]*\bP\b", lines[i]):
                drop.add(i); removed.append(lines[i].strip())

src = "\n".join(l for i, l in enumerate(lines) if i not in drop)
src = re.sub(r"\n{3,}", "\n\n", src)
for r in removed:
    print("    removed:\n      " + r.replace("\n", "\n      "))

added = []
# Renewals: acme.sh writes the http-01 token under Example/html, and this context has to win
# over the proxy below or every renewal fails.
if "/.well-known/acme-challenge" not in src:
    src = src.rstrip() + """

context /.well-known/acme-challenge {
  location                /usr/local/lsws/Example/html/.well-known/acme-challenge
  allowBrowse             1

  rewrite  {
     enable                  0
  }
  addDefaultCharset       off
}
"""
    added.append("acme context")

src = src.rstrip() + f"""

extprocessor joelacademy {{
  type                    proxy
  address                 127.0.0.1:{port}
  maxConns                100
  pcKeepAliveTimeout      60
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}}

context / {{
  type                    proxy
  handler                 joelacademy
  addDefaultCharset       off
}}
"""
added += ["extprocessor joelacademy", "context /"]

# Force https: the session cookie is Secure, so plain http can never sign in.
rule = (f"  rules                   <<<END_rules\n"
        f"RewriteCond %{{HTTPS}} !on\n"
        f"RewriteRule ^(.*)$ https://{domain}%{{REQUEST_URI}} [R=301,L]\n"
        f"  END_rules\n")
if "RewriteCond %{HTTPS}" not in src:
    m = re.search(r"^rewrite\s*\{[^}]*?(?=^\})", src, re.M | re.S)
    if m and "rules" not in m.group(0):
        block = m.group(0)
        if "enable" in block:
            block = re.sub(r"^(\s*enable\s+)\S+", r"\g<1>1", block, count=1, flags=re.M)
        else:
            block = block.rstrip("\n") + "\n  enable                  1\n"
        src = src[:m.start()] + block.rstrip("\n") + "\n" + rule + src[m.end():]
        added.append("https redirect")
    elif not m:
        src = src.rstrip() + "\n\nrewrite  {\n  enable                  1\n" + rule + "}\n"
        added.append("https redirect")
    else:
        print("    note: the vhost already has rewrite rules; add the https redirect by hand if http does not redirect")

open(path, "w").write(src.rstrip() + "\n")
print("    vhost changes:", ", ".join(added))
PY

echo "    restarting OpenLiteSpeed..."
"${LSWS}/bin/lswsctrl" restart >/dev/null 2>&1 || true
sleep 5

ok=1
read -r code body < <(curl -sk --max-time 20 --resolve "${DOMAIN}:443:127.0.0.1" \
      -w '\n%{http_code}' "https://${DOMAIN}/health/ready" | tac | tr '\n' ' ' || echo "000 -")
printf '    https://%s/health/ready  %s  %s\n' "${DOMAIN}" "${code}" "${body}"
[[ "${code}" == "200" && "${body}" == *'"status":"ok"'* ]] || ok=0
home="$(curl -sk --max-time 20 --resolve "${DOMAIN}:443:127.0.0.1" -o /dev/null -w '%{http_code}' "https://${DOMAIN}/" || echo 000)"
printf '    https://%s/              %s\n' "${DOMAIN}" "${home}"
[[ "${home}" == "200" ]] || ok=0
redir="$(curl -s --max-time 20 --resolve "${DOMAIN}:80:127.0.0.1" -o /dev/null -w '%{http_code} %{redirect_url}' "http://${DOMAIN}/login" || echo "000 -")"
printf '    http://%s/login          %s\n' "${DOMAIN}" "${redir}"
[[ "${redir}" == 30[18]\ https://${DOMAIN}/login* ]] || echo "    note: http does not redirect to https — sign-in needs https"

if [[ ${ok} -ne 1 ]]; then
  echo
  echo "    !! verification failed — restoring the previous OpenLiteSpeed config"
  cp -a "${VHCONF}.bak.${SERVICE}.${TS}" "${VHCONF}"
  cp -a "${CONF}.bak.${SERVICE}.${TS}"   "${CONF}"
  "${LSWS}/bin/lswsctrl" restart >/dev/null 2>&1 || true
  echo "    rolled back: ${DOMAIN} serves the previous app again. This app is still running on 127.0.0.1:${APP_PORT}:"
  curl -s -o /dev/null -w "      direct app check: %{http_code}\n" "http://127.0.0.1:${APP_PORT}/health/ready"
  echo "      OpenLiteSpeed error log: tail -50 ${LSWS}/logs/error.log"
  exit 1
fi

printf '\n\033[1;32mDone.\033[0m  https://%s/\n\n' "${DOMAIN}"
echo "Useful:"
echo "  systemctl status ${SERVICE}      # app status"
echo "  journalctl -u ${SERVICE} -f      # app logs"
echo "  As admin, a graceful restart is: kill -TERM \$(pgrep -u admin -f '${APP_DIR}/[s]erver\\.js')"
echo "  Back to the Next.js LMS: cp -a ${VHCONF}.bak.${SERVICE}.${TS} ${VHCONF} && ${LSWS}/bin/lswsctrl restart"
