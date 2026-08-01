#!/usr/bin/env bash
#
# Roicard droplet provisioning script
# Target: Ubuntu 24.04 (DigitalOcean droplet, clean install)
# Run as: sudo bash provision.sh
#
# Installs: Nginx, PHP 8.3 (php-fpm), Composer, MySQL 8, Node 20, pm2
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "==> Updating system"
apt-get update -y && apt-get upgrade -y

echo "==> Installing base packages"
apt-get install -y \
    curl wget git unzip zip gnupg ca-certificates \
    software-properties-common lsb-release ufw \
    supervisor

echo "==> Adding PHP 8.3 (ondrej) repository"
add-apt-repository -y ppa:ondrej/php
apt-get update -y

echo "==> Installing PHP 8.3 + extensions"
apt-get install -y \
    php8.3-fpm php8.3-cli php8.3-common \
    php8.3-mysql php8.3-pgsql php8.3-pdo \
    php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip \
    php8.3-gd php8.3-bcmath php8.3-intl php8.3-sqlite3 \
    php8.3-redis php8.3-imagick

echo "==> Installing Composer"
if [ ! -f /usr/local/bin/composer ]; then
    php -r "copy('https://getcomposer.org/installer', '/tmp/composer-setup.php');"
    php /tmp/composer-setup.php --install-dir=/usr/local/bin --filename=composer
    rm -f /tmp/composer-setup.php
fi
composer --version

echo "==> Installing MySQL 8"
apt-get install -y mysql-server

echo "==> Adding NodeSource Node 20"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

echo "==> Installing Nginx"
apt-get install -y nginx

echo "==> Setting timezone to UTC"
timedatectl set-timezone UTC

echo ""
echo "Provisioning complete. Next steps:"
echo "  1) Secure MySQL:  sudo mysql_secure_installation"
echo "  2) Create DB + user (see deploy/README.md)"
echo "  3) Copy repo to /var/www/roicard"
echo "  4) Deploy the nginx config from deploy/nginx.conf"
echo "  5) Copy systemd/supervisor units from deploy/"
echo "  6) Run backend/frontend install steps from deploy/README.md"
