#!/usr/bin/env bash
#
# Roicard incident check - READ-ONLY, safe to run on a live server.
#
# Answers two questions after a runtime CVE:
#   1. Are the runtimes actually patched?
#   2. Is there evidence we were exploited before we patched?
#
# Usage:
#   sudo bash deploy/incident-check.sh
#   sudo bash deploy/incident-check.sh --since 2026-10-21 --app /var/www/roicard
#
# --since defaults to the PHP RCE disclosure date (CVE-2026-109618/109619).
# Widen it if the box ran a vulnerable runtime earlier than that.
# Exit code 0 = nothing found, 1 = review the FAIL lines above.

set -uo pipefail

SINCE="2026-10-21"
APP="/var/www/roicard"
PHP_FLOOR="8.3.36"

while [ $# -gt 0 ]; do
    case "$1" in
        --since) SINCE="${2:?--since needs a date, e.g. 2026-10-21}"; shift 2 ;;
        --app)   APP="${2:?--app needs a path}"; shift 2 ;;
        -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
        *) echo "unknown option: $1 (try --help)" >&2; exit 2 ;;
    esac
done

DOCROOT="$APP/public"
FINDINGS=0

section() { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }
fail()    { FINDINGS=$((FINDINGS + 1)); printf '  FAIL  %s\n' "$*"; }
warn()    { printf '  WARN  %s\n' "$*"; }
ok()      { printf '  ok    %s\n' "$*"; }
info()    { printf '        %s\n' "$*"; }

version_ge() { [ "$1" = "$2" ] && return 0; [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | tail -n1)" = "$1" ]; }

printf '\033[1mRoicard incident check\033[0m - %s on %s\n' "$(date -u '+%Y-%m-%d %H:%M UTC')" "$(hostname)"
printf 'app=%s  since=%s\n' "$APP" "$SINCE"

# --- 1. Runtimes -------------------------------------------------------------
section "Runtime versions"

if command -v php >/dev/null 2>&1; then
    phpv="$(php -r 'echo PHP_VERSION;' 2>/dev/null || echo unknown)"
    if version_ge "$phpv" "$PHP_FLOOR"; then ok "php-cli $phpv (>= $PHP_FLOOR)"
    else fail "php-cli $phpv < $PHP_FLOOR (CVE-2026-109618/109619)"; fi
else
    warn "php not found in PATH"
fi

if command -v php-fpm8.3 >/dev/null 2>&1; then
    fpmv="$(php-fpm8.3 -v 2>/dev/null | head -n1 | awk '{print $2}')"
    if version_ge "${fpmv:-0}" "$PHP_FLOOR"; then ok "php-fpm $fpmv (the process actually serving requests)"
    else fail "php-fpm $fpmv < $PHP_FLOOR - restart php8.3-fpm after upgrading"; fi
fi

if command -v node >/dev/null 2>&1; then
    nodev="$(node -v | tr -d 'v')"
    floor=""
    case "${nodev%%.*}" in
        22) floor="22.23.4" ;;
        24) floor="24.22.1" ;;
        26) floor="26.12.1" ;;
    esac
    if [ -z "$floor" ]; then fail "node $nodev is EOL/unsupported (CVE-2026-111497)"
    elif version_ge "$nodev" "$floor"; then ok "node $nodev (>= $floor)"
    else fail "node $nodev < $floor (CVE-2026-111497)"; fi
else
    warn "node not found in PATH"
fi

nextpkg="$APP/client/node_modules/next/package.json"
if [ -f "$nextpkg" ]; then
    nextv="$(grep -m1 '"version"' "$nextpkg" | sed 's/.*"version": *"\([^"]*\)".*/\1/')"
    case "$nextv" in
        16.3.8|16.4.[1-9]*|16.[5-9]*|1[7-9].*|2[0-9].*)
            ok "next $nextv (installed) - outside the Oct 2026 advisory ranges" ;;
        *)
            fail "next $nextv (installed) is in range of GHSA-vcvr-r3jv-pc5j / GHSA-2464-fhr4-w9xw - need >= 16.4.1" ;;
    esac
fi

# --- 2. Working tree ---------------------------------------------------------
section "Working tree"
if [ -d "$APP/.git" ]; then
    if dirty="$(git -C "$APP" status --porcelain -- . ':(exclude)storage' ':(exclude)bootstrap/cache' 2>/dev/null)"; then
        if [ -n "$dirty" ]; then
            warn "uncommitted changes (unexpected drift on a deploy target):"
            printf '%s\n' "$dirty" | sed 's/^/        /'
        else
            ok "clean (excluding storage/, bootstrap/cache/)"
        fi
    fi
else
    warn "$APP is not a git checkout"
fi

# --- 3. Recently written PHP ------------------------------------------------
section "PHP files written since $SINCE"
mapfile -t recent < <(find "$APP" -xdev \
    \( -name vendor -o -name node_modules -o -name .git -o -name dist \
       -o -name bootstrap -o -name 'storage' \) -prune -o \
    -type f -newermt "$SINCE" \
    \( -name '*.php' -o -name '*.phtml' -o -name '*.phar' \) \
    -print 2>/dev/null | sort)
if [ "${#recent[@]}" -eq 0 ]; then
    ok "none"
else
    fail "${#recent[@]} file(s) to review - a deploy would explain these, an intrusion would not"
    printf '        %s\n' "${recent[@]}"
fi

# --- 4. PHP where it must never be ------------------------------------------
section "PHP outside public/index.php"
mapfile -t stray < <(find "$DOCROOT" "$APP/storage/app" -xdev -type f \
    \( -name '*.php*' -o -name '*.pht' -o -name '*.phar' \) \
    ! -path "$DOCROOT/index.php" -print 2>/dev/null | sort)
if [ "${#stray[@]}" -eq 0 ]; then
    ok "none"
else
    fail "${#stray[@]} PHP file(s) under the docroot or uploads:"
    printf '        %s\n' "${stray[@]}"
fi

# --- 5. Webshell heuristics -------------------------------------------------
section "Suspicious PHP patterns (heuristic)"
mapfile -t sus < <(grep -rlE \
    'eval[[:space:]]*\(|shell_exec[[:space:]]*\(|passthru[[:space:]]*\(|proc_open[[:space:]]*\(|(system|exec)[[:space:]]*\([[:space:]]*\$_(GET|POST|REQUEST|COOKIE)|base64_decode[[:space:]]*\([[:space:]]*\$_(GET|POST|REQUEST|COOKIE)' \
    "$DOCROOT" "$APP/app" "$APP/routes" 2>/dev/null | sort)
if [ "${#sus[@]}" -eq 0 ]; then
    ok "no exec/eval patterns in app code"
else
    warn "${#sus[@]} file(s) matched - check these are legitimate:"
    printf '        %s\n' "${sus[@]}"
fi

# --- 6. Crash / OOM evidence ------------------------------------------------
section "Crash / OOM evidence since $SINCE"
if command -v journalctl >/dev/null 2>&1; then
    crashes="$(journalctl --since "$SINCE" --no-pager 2>/dev/null \
        | grep -iE 'php-fpm.*(segfault|signal 11|core dumped)|oom-kill|Out of memory: Killed process' \
        | tail -n 20)"
    if [ -n "$crashes" ]; then
        fail "segfault/OOM lines found - the fingerprint of CVE-2026-109618"
        printf '%s\n' "$crashes" | sed 's/^/        /'
    else
        ok "no segfault / OOM-kill lines"
    fi
else
    warn "journalctl not available - check /var/log/syslog manually"
fi

# --- 7. Network -------------------------------------------------------------
section "Established non-local connections"
if command -v ss >/dev/null 2>&1; then
    conns="$(ss -tupn state established 2>/dev/null | awk 'NR>1' \
        | grep -vE '(127\.0\.0\.1|\[::1\])' | head -n 20)"
    if [ -n "$conns" ]; then
        warn "review - expect only MySQL/Redis/outbound API calls:"
        printf '%s\n' "$conns" | sed 's/^/        /'
    else
        ok "none"
    fi
else
    warn "ss not available"
fi

# --- 8. Persistence ---------------------------------------------------------
section "Persistence surfaces"
PERSIST=0
for user in root www-data; do
    c="$(crontab -u "$user" -l 2>/dev/null | grep -vE '^[[:space:]]*(#|$)' || true)"
    if [ -n "$c" ]; then
        PERSIST=1
        info "crontab[$user]:"
        printf '%s\n' "$c" | sed 's/^/        /'
    fi
done

new_cron="$(find /etc/cron.d /etc/cron.daily /etc/cron.hourly -maxdepth 1 -type f -newermt "$SINCE" 2>/dev/null || true)"
[ -n "$new_cron" ] && { PERSIST=1; warn "cron files modified since $SINCE:"; printf '%s\n' "$new_cron" | sed 's/^/        /'; }

new_units="$(find /etc/systemd/system -maxdepth 2 -type f -newermt "$SINCE" \
    \( -name '*.service' -o -name '*.timer' \) 2>/dev/null || true)"
[ -n "$new_units" ] && { PERSIST=1; warn "systemd units modified since $SINCE:"; printf '%s\n' "$new_units" | sed 's/^/        /'; }

for key in /root/.ssh/authorized_keys /home/*/.ssh/authorized_keys; do
    [ -f "$key" ] || continue
    if [ -n "$(find "$key" -newermt "$SINCE" 2>/dev/null || true)" ]; then
        PERSIST=1
        fail "$key modified since $SINCE"
    fi
done

[ "$PERSIST" -eq 0 ] && ok "no crontab / unit / authorized_keys changes since $SINCE"

# --- 9. App config ----------------------------------------------------------
section "Application config"
if [ -f "$APP/.env" ]; then
    app_env="$(grep -E '^APP_ENV=' "$APP/.env" | cut -d= -f2- | tr -d '"' || true)"
    app_dbg="$(grep -E '^APP_DEBUG=' "$APP/.env" | cut -d= -f2- | tr -d '"' || true)"
    [ "$app_env" = "production" ] && ok "APP_ENV=production" || warn "APP_ENV=${app_env:-unset} (expected production)"
    case "$app_dbg" in
        true|1) fail "APP_DEBUG=$app_dbg - stack traces and env values leak to users" ;;
        *)      ok "APP_DEBUG=${app_dbg:-unset}" ;;
    esac
else
    warn "$APP/.env not found"
fi

# --- Summary ----------------------------------------------------------------
printf '\n'
if [ "$FINDINGS" -eq 0 ]; then
    printf '\033[1;32mNo findings.\033[0m Runtimes patched, no exploitation artefacts.\n'
    exit 0
fi
printf '\033[1;31m%d finding(s) need review.\033[0m\n' "$FINDINGS"
printf 'If any FAIL is not explained by a deploy you made, treat the host as compromised:\n'
printf '  rotate .env / credentials.local.txt secrets, re-issue API keys, review DB for changes.\n'
exit 1
