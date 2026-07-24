#!/bin/bash
set -e

# Generate APP_KEY if not set
if [ -z "$APP_KEY" ] || [ "$APP_KEY" = "base64:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx=" ]; then
    php artisan key:generate
fi

# Cache config and routes
php artisan config:cache 2>/dev/null || true
php artisan route:cache 2>/dev/null || true

# Fresh migrate on first deploy to ensure clean schema; subsequent deploys use normal migrate
if [ ! -f /var/www/html/storage/framework/cache/migrated.flag ]; then
    php artisan migrate:fresh --force --seed
    touch /var/www/html/storage/framework/cache/migrated.flag
else
    php artisan migrate --force --seed
fi

exec apache2-foreground
