#!/bin/bash
set -e

# Generate APP_KEY if not set
if [ -z "$APP_KEY" ] || [ "$APP_KEY" = "base64:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx=" ]; then
    php artisan key:generate --force
fi

# Cache config and routes
php artisan config:cache --force 2>/dev/null || true
php artisan route:cache --force 2>/dev/null || true

# Run migrations
php artisan migrate --force --seed

exec apache2-foreground
