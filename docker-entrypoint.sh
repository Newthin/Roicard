#!/bin/bash
set -e

# Wait for MySQL to be reachable
for i in $(seq 1 30); do
  php -r "new PDO('mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_DATABASE', '$DB_USERNAME', '$DB_PASSWORD');" 2>/dev/null && break
  echo "Waiting for MySQL ($i/30)..."
  sleep 2
done

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
