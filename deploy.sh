#!/usr/bin/env bash
set -euo pipefail

# ROICARD production deploy script
# Usage: bash deploy.sh
# Run as the deploy user (with sudo rights) on the droplet.

BACKEND_DIR=/var/www/roicard
FRONTEND_DIR=/var/www/roicard/client
API_URL="${NEXT_PUBLIC_API_URL:-https://myroicard.com/api}"
SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://myroicard.com}"

# --- Runtime security floor -------------------------------------------------
# Refuse to ship code onto a runtime we know is exploitable. These values come
# from the Oct 2026 advisories; bump them when a new patch release lands.
#   PHP  : CVE-2026-109618 / CVE-2026-109619 (unauthenticated RCE)
#   Node : CVE-2026-111497 (Brotli decoder RCE, aka Node2Shell)
version_ge() { # returns success when $1 >= $2
    [ "$1" = "$2" ] && return 0
    [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | tail -n1)" = "$1" ]
}

check_php() {
    local v floor
    v="$(php -r 'echo PHP_VERSION;')"
    case "$v" in
        8.2.*) floor="8.2.35" ;;
        8.3.*) floor="8.3.36" ;;
        8.4.*) floor="8.4.27" ;;
        8.5.*) floor="8.5.12" ;;
        *)     echo "ERROR: PHP $v is end-of-life and will never be patched (CVE-2026-109618/109619)." >&2
               exit 1 ;;
    esac
    version_ge "$v" "$floor" || {
        echo "ERROR: PHP $v < $floor. Run 'apt-get install --only-upgrade php8.3-*' first (CVE-2026-109618/109619)." >&2
        exit 1
    }
    echo "    PHP $v OK (>= $floor)"
}

check_node() {
    local v major floor
    v="$(node -v | tr -d 'v')"
    major="${v%%.*}"
    case "$major" in
        22) floor="22.23.4" ;;
        24) floor="24.22.1" ;;
        26) floor="26.12.1" ;;
        *)  echo "ERROR: Node.js $v is EOL/unsupported. Need 22.23.4+, 24.22.1+ or 26.12.1+ (CVE-2026-111497)." >&2
            exit 1 ;;
    esac
    version_ge "$v" "$floor" || {
        echo "ERROR: Node.js $v < $floor for the $major.x line (CVE-2026-111497)." >&2
        exit 1
    }
    echo "    Node.js $v OK (>= $floor)"
}

echo "==> Checking runtime versions"
check_php
check_node

echo "==> Deploying backend"
cd "$BACKEND_DIR"
sudo git pull origin main
sudo composer install --no-dev --optimize-autoloader

# composer.json sets policy.advisories.block=false, so install never fails on
# an advisory. Surface them here as a warning instead of silently shipping.
if ! sudo composer audit --no-dev; then
    echo "WARNING: composer audit reported advisories (see above). Not blocking deploy."
fi

echo "==> Refreshing Laravel caches (routes/config/views) so fresh code is served"
sudo php artisan config:clear
sudo php artisan route:clear
sudo php artisan view:clear
sudo php artisan migrate --force

# Idempotent and production-safe: only ensures the member/admin roles exist.
# Prevents OAuth/registration failures on databases where the seeder never ran.
sudo php artisan db:seed --class=RoleSeeder --force

echo "==> Restarting PHP-FPM"
sudo systemctl restart php8.3-fpm

echo "==> Restarting queue worker"
sudo systemctl restart roicard-worker

echo "==> Deploying frontend"
cd "$FRONTEND_DIR"
sudo git pull origin main

if ! npm audit --omit=dev --audit-level=critical; then
    echo "ERROR: npm audit found CRITICAL advisories in production dependencies. Not deploying." >&2
    exit 1
fi
if ! npm audit --omit=dev --audit-level=high; then
    echo "WARNING: npm audit reported high-severity advisories (see above). Continuing."
fi

sudo NEXT_PUBLIC_API_URL="$API_URL" NEXT_PUBLIC_SITE_URL="$SITE_URL" npm run build
sudo systemctl restart roicard-frontend

echo "==> Done. https://myroicard.com is up to date."
