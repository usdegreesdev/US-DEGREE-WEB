#!/usr/bin/env bash
# Runs ON THE VPS (streamed over SSH by .github/workflows/deploy.yml).
#
#   release.sh activate <release-name>   switch `current` to the release, restart
#                                        PM2, health-check; auto-rollback on failure
#   release.sh rollback                  switch `current` back to the previous release
#
# Layout under $BASE:
#   releases/<name>/   immutable, one per deploy (never modified after upload)
#   current            symlink -> releases/<name>   (what PM2 runs)
#   previous           file holding the name of the last known-good release
#   shared/            .env.production and anything that must survive deploys
# Only `current`/`previous` and old releases are ever touched; an existing
# `shared/.env.production` is never overwritten, and the legacy
# /var/www/usdegrees/web directory is only ever read, never modified or deleted.
set -Eeuo pipefail

BASE="/var/www/usdegrees/web-releases"
APP="usdegrees-web"
KEEP=5
ENV_FILE="$BASE/shared/.env.production"
LEGACY_DIR="/var/www/usdegrees/web"

log() { printf '[release] %s\n' "$*"; }

# First deploy only: seed the shared env file from the legacy checkout so the
# cutover keeps the exact runtime config `npm start` had. Never overwrites.
seed_env_file() {
  [[ -f "$ENV_FILE" ]] && return 0
  [[ -f "$LEGACY_DIR/.env.production" ]] || return 1
  install -d -m 700 "$BASE/shared"
  install -m 600 "$LEGACY_DIR/.env.production" "$ENV_FILE"
  log "seeded $ENV_FILE from $LEGACY_DIR/.env.production"
}

# First deploy only: if the very first standalone release fails and there is no
# earlier release to fall back to, bring the legacy `npm start` process back
# rather than leaving the site down.
restore_legacy() {
  [[ -f "$LEGACY_DIR/.next/BUILD_ID" ]] || return 1
  log "restoring legacy npm start process from $LEGACY_DIR"
  rm -f -- "$BASE/current"
  pm2 delete "$APP" >/dev/null 2>&1 || true
  pm2 start npm --name "$APP" --cwd "$LEGACY_DIR" -- start
  pm2 save >/dev/null
  health_check
}

app_port() {
  local p
  p=$(sed -nE 's/^[[:space:]]*PORT[[:space:]]*=[[:space:]]*["'\'']?([0-9]+)["'\'']?[[:space:]]*$/\1/p' "$ENV_FILE" 2>/dev/null | tail -n1 || true)
  echo "${p:-3000}"
}

current_name() { basename "$(readlink -f "$BASE/current" 2>/dev/null || true)"; }

# Atomic symlink switch (rename(2) over the old link).
point_current_at() {
  ln -sfn "$BASE/releases/$1" "$BASE/current.tmp"
  mv -T "$BASE/current.tmp" "$BASE/current"
}

# Start or restart PM2 for the release `current` points at. The first deploy has
# to migrate the legacy `npm start` process, whose script/cwd differ, so those
# are deleted and recreated; afterwards a plain restart is enough.
pm2_apply() {
  local cfg="$BASE/current/ecosystem.config.cjs" matches
  matches=$(pm2 jlist 2>/dev/null | node -e '
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      try {
        const p = JSON.parse(s).find(x => x.name === process.argv[1]);
        process.stdout.write(p && p.pm2_env.pm_cwd === process.argv[2] ? "yes" : p ? "stale" : "none");
      } catch { process.stdout.write("none"); }
    });' "$APP" "$BASE/current" || echo none)
  case "$matches" in
    yes)   pm2 restart "$cfg" --only "$APP" --update-env ;;
    stale) pm2 delete "$APP"; pm2 start "$cfg" --only "$APP" ;;
    *)     pm2 start "$cfg" --only "$APP" ;;
  esac
  pm2 save >/dev/null
}

health_check() {
  local port code i
  port=$(app_port)
  for i in $(seq 1 30); do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:$port/" || true)
    if [[ "$code" =~ ^[23] ]]; then
      log "health check OK (HTTP $code on :$port)"
      return 0
    fi
    sleep 2
  done
  log "health check FAILED (last HTTP code: ${code:-none} on :$port)"
  return 1
}

do_rollback() {
  local prev
  prev=$(cat "$BASE/previous" 2>/dev/null || true)
  if [[ -z "$prev" || ! -d "$BASE/releases/$prev" ]]; then
    log "no previous release to roll back to"
    return 1
  fi
  log "rolling back to $prev"
  point_current_at "$prev"
  pm2_apply
  health_check
}

prune_old() {
  local cur prev
  cur=$(current_name); prev=$(cat "$BASE/previous" 2>/dev/null || true)
  ls -1dt "$BASE"/releases/*/ 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r d; do
    d=${d%/}
    [[ "$(basename "$d")" == "$cur" || "$(basename "$d")" == "$prev" ]] && continue
    log "pruning $(basename "$d")"
    rm -rf -- "$d"
  done
}

case "${1:-}" in
  activate)
    name="${2:?release name required}"
    for f in server.js .next/BUILD_ID .next/static public ecosystem.config.cjs; do
      [[ -e "$BASE/releases/$name/$f" ]] || { log "release $name is incomplete (missing $f)"; exit 1; }
    done
    seed_env_file || { log "missing $ENV_FILE — see setup docs"; exit 1; }

    old=$(current_name)
    [[ "$old" == "." || "$old" == "/" ]] && old=""
    log "activating $name (previous: ${old:-none})"
    point_current_at "$name"

    if pm2_apply && health_check; then
      [[ -n "$old" && "$old" != "$name" ]] && echo "$old" > "$BASE/previous"
      prune_old
      log "release $name is live"
    else
      log "activation failed"
      if [[ -n "$old" && -d "$BASE/releases/$old" ]]; then
        echo "$old" > "$BASE/previous"
        do_rollback && log "rolled back to $old" || log "ROLLBACK ALSO FAILED — manual intervention needed"
      else
        restore_legacy && log "legacy process restored" || log "LEGACY RESTORE FAILED — manual intervention needed"
      fi
      exit 1
    fi
    ;;
  rollback)
    cur=$(current_name)
    do_rollback
    # Remember the broken release only for inspection; it stays on disk.
    log "now serving $(current_name) (rolled back from ${cur:-unknown})"
    ;;
  *)
    echo "usage: $0 activate <release-name> | rollback" >&2
    exit 2
    ;;
esac
