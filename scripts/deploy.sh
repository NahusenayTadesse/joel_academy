#!/usr/bin/env bash
#
# Ships build/ to the server, keeping the last few builds to roll back to — the same procedure
# as alpha-steel, ghion and stock-management on this box.
#
#   npm run deploy              # build, verify, back up, ship, restart, check
#   npm run deploy -- --dry-run # say what would happen, touch nothing
#   npm run deploy -- --skip-build
#
# The server holds no node_modules: build/ must be self-contained, which is what verify:build
# enforces (and why `dependencies` in package.json is empty — adapter-node leaves anything listed
# there as a bare import). Environment variables are managed by hand on the server and are
# deliberately not touched here.
#
# Besides build/, only server.js (the LiteSpeed Origin fix) and the trimmed package.json from
# .deploy/ (`"type": "module"`, which server.js needs) are shipped. Uploads (files/) are never
# synced — the server's copy is the live one.
set -euo pipefail

HOST="${DEPLOY_HOST:-digital}"
APP="${DEPLOY_PATH:-/home/admin/apps/joel-academy}"
SERVICE="joel-academy"
PORT="${DEPLOY_PORT:-3050}"
# How many previous builds to keep. Each is a hardlink copy, so a backup costs almost nothing.
KEEP="${DEPLOY_KEEP:-2}"

DRY_RUN=0
SKIP_BUILD=0
for arg in "$@"; do
	case "$arg" in
	--dry-run) DRY_RUN=1 ;;
	--skip-build) SKIP_BUILD=1 ;;
	*)
		echo "unknown option: $arg" >&2
		exit 2
		;;
	esac
done

say() { printf '\n\033[1m→ %s\033[0m\n' "$1"; }
run() {
	if [ "$DRY_RUN" = 1 ]; then
		printf '   would run: %s\n' "$*"
	else
		"$@"
	fi
}

[ "$KEEP" -ge 1 ] || {
	echo "DEPLOY_KEEP must be at least 1 — something has to be left to roll back to" >&2
	exit 2
}

# ---------------------------------------------------------------- preflight
say "Checking $HOST is reachable"
ssh -o BatchMode=yes -o ConnectTimeout=15 "$HOST" "test -d '$APP'" ||
	{
		echo "cannot reach $HOST, or $APP is missing" >&2
		exit 1
	}
echo "   ok"

# ---------------------------------------------------------------- build
if [ "$SKIP_BUILD" = 1 ]; then
	say "Skipping build (--skip-build)"
	[ -f build/handler.js ] && [ -f .deploy/package.json ] || {
		echo "build/handler.js or .deploy/package.json is missing — nothing to ship" >&2
		exit 1
	}
else
	say "Building"
	run npm run build
fi

# Always, even with --skip-build: the check is cheap and the failure it catches is silent in
# production.
say "Verifying the bundle is self-contained"
run npm run verify:build

say "Checking schema compatibility before replacing the running build"
run npm run db:migrate:remote -- --check

# ---------------------------------------------------------------- back up
TS="$(date +%Y%m%d-%H%M%S)"
say "Backing up the running build as build.bak.$TS"
run ssh "$HOST" "cd '$APP' && { [ -d build ] && cp -al build 'build.bak.$TS' || echo '   (no build yet — first deploy)'; }"

# ---------------------------------------------------------------- prune
#
# After the backup, so the count includes the one just made. Only `build.bak.<timestamp>` is
# pruned: those sort by date, and anything else is not this script's to delete.
say "Keeping the newest $KEEP backup(s)"
# shellcheck disable=SC2029
run ssh "$HOST" "cd '$APP' && \
	ls -1d build.bak.* 2>/dev/null | sort -r | tail -n +$((KEEP + 1)) | while read -r d; do echo \"   removing \$d\"; rm -rf -- \"\$d\"; done; \
	echo \"   kept: \$(ls -1d build.bak.* 2>/dev/null | sort -r | tr '\n' ' ')\"; \
	for d in build.bak-* build.broken; do [ -e \"\$d\" ] && echo \"   note: \$d is not named build.bak.<timestamp>, so it is left alone — remove it by hand when you are done with it\"; done; true"

# ---------------------------------------------------------------- ship
say "Syncing build/ to $HOST:$APP/build/"
if [ "$DRY_RUN" = 1 ]; then
	rsync -az --delete --dry-run --stats build/ "$HOST:$APP/build/" | grep -E 'files transferred|deleted' || true
else
	rsync -az --delete build/ "$HOST:$APP/build/"
fi

say "Syncing server.js and package.json"
run rsync -az server.js "$HOST:$APP/"
run rsync -az .deploy/package.json "$HOST:$APP/package.json"

# ---------------------------------------------------------------- restart
#
# SIGTERM rather than `systemctl restart`, which would ask for a password the deploying user does
# not have. The unit is Restart=always with RestartSec=3 and server.js closes cleanly on SIGTERM,
# so systemd brings it straight back. The bracket in "[s]erver" keeps pgrep from matching the
# shell ssh started to run it.
say "Restarting $SERVICE"
run ssh "$HOST" "kill -TERM \$(pgrep -u admin -f '$APP/[s]erver\.js') 2>/dev/null || true"

if [ "$DRY_RUN" = 1 ]; then
	say "Dry run — nothing was changed"
	exit 0
fi

# ---------------------------------------------------------------- verify
say "Waiting for it to come back"
for i in $(seq 1 20); do
	sleep 2
	if ssh "$HOST" "curl -sf --max-time 5 http://127.0.0.1:$PORT/health/ready" 2>/dev/null | grep -q '"status":"ok"'; then
		echo "   healthy after $((i * 2))s"
		HEALTHY=1
		break
	fi
	printf '   ...%ss\n' "$((i * 2))"
done

if [ "${HEALTHY:-0}" != 1 ]; then
	echo
	echo "✗ $SERVICE did not report healthy." >&2
	echo "  Logs:     ssh $HOST 'journalctl -u $SERVICE -n 50 --no-pager'" >&2
	echo "  Rollback: ssh $HOST \"cd '$APP' && mv build build.broken && cp -al build.bak.$TS build && kill -TERM \\\$(pgrep -u admin -f '$APP/[s]erver\.js')\"" >&2
	exit 1
fi

# Loopback only proves the process; the public surface goes through LiteSpeed and the real origin.
ORIGIN="$(ssh "$HOST" "grep -E '^ORIGIN=' '$APP/.env' | cut -d= -f2- | tr -d '\"'" 2>/dev/null || true)"
if [ -n "$ORIGIN" ]; then
	say "Checking the public surface over $ORIGIN"
	for path in / /courses /login /certificates/verify /health /health/ready; do
		code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$ORIGIN$path" || echo 000)"
		printf '   %-22s %s\n' "$path" "$code"
		[ "$code" = 200 ] || exit 1
	done
fi

say "Deployed"
echo "   Rollback: ssh $HOST \"cd '$APP' && mv build build.broken && cp -al build.bak.$TS build && kill -TERM \\\$(pgrep -u admin -f '$APP/[s]erver\.js')\""
