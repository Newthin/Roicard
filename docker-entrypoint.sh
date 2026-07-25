#!/bin/bash
set -e

# Generate APP_KEY if not set
if [ -z "$APP_KEY" ] || [ "$APP_KEY" = "base64:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx=" ]; then
    php artisan key:generate
fi

# Clear stale route cache
rm -f /var/www/html/bootstrap/cache/routes-v7.php /var/www/html/bootstrap/cache/routes.php

# Cache config (silent)
php artisan config:cache 2>/dev/null || true

# Run migrations and seed initial data
php artisan migrate --force --seed

exec apache2-foreground
