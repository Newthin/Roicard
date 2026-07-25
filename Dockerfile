FROM php:8.3-apache

ENV COMPOSER_ALLOW_SUPERUSER=1

WORKDIR /var/www/html

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git unzip libzip-dev libpng-dev libjpeg-dev libfreetype6-dev \
    libonig-dev libxml2-dev curl \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    pdo_mysql mbstring zip gd bcmath xml exif

# Enable Apache modules
RUN a2enmod rewrite headers

# Configure Apache to serve from public/
RUN sed -i 's|/var/www/html|/var/www/html/public|g' \
    /etc/apache2/sites-available/000-default.conf \
    /etc/apache2/apache2.conf

# Allow .htaccess and add CORS headers
RUN sed -i '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' \
    /etc/apache2/apache2.conf && \
    sed -i '/<\/VirtualHost>/i \
    Header always set Access-Control-Allow-Origin "*" \
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" \
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, Accept" \
    Header always set Access-Control-Max-Age "86400"' \
    /etc/apache2/sites-available/000-default.conf

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copy application
COPY . .

# Ensure bootstrap/cache exists and create temp .env for package discovery
RUN mkdir -p bootstrap/cache && \
    echo "APP_KEY=" > .env && \
    php artisan key:generate --force 2>/dev/null; \
    echo "APP_NAME=Roicard" >> .env

# Install dependencies
RUN composer install --no-interaction --optimize-autoloader --no-dev

# Remove temp .env, create storage structure, and set permissions
RUN rm -f .env && \
    mkdir -p storage/app/public storage/framework/cache storage/framework/sessions storage/framework/views storage/logs && \
    chmod -R 777 storage bootstrap/cache

EXPOSE 80

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
