#!/usr/bin/env bash
set -euo pipefail

# ROICARD production deploy script
# Usage: bash deploy.sh
# Run as the deploy user (with sudo rights) on the droplet.

BACKEND_DIR=/var/www/roicard
FRONTEND_DIR=/var/www/roicard/client
API_URL="${NEXT_PUBLIC_API_URL:-https://app.myroicard.com/api}"

echo "==> Deploying backend"
cd "$BACKEND_DIR"
sudo git pull origin main
sudo composer install --no-dev --optimize-autoloader

echo "==> Refreshing Laravel caches (routes/config/views) so fresh code is served"
sudo php artisan config:clear
sudo php artisan route:clear
sudo php artisan view:clear
sudo php artisan migrate --force

echo "==> Restarting PHP-FPM"
sudo systemctl restart php8.3-fpm

echo "==> Restarting queue worker"
sudo systemctl restart roicard-worker

echo "==> Deploying frontend"
cd "$FRONTEND_DIR"
sudo git pull origin main
sudo NEXT_PUBLIC_API_URL="$API_URL" npm run build
sudo systemctl restart roicard-frontend

echo "==> Done. https://app.myroicard.com is up to date."
