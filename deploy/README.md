# Roicard Deployment Guide — DigitalOcean Droplet

This guide deploys Roicard to a single Ubuntu 24.04 droplet running everything
(Nginx + PHP-FPM for the Laravel API, Node/pm2 for the Next.js frontend, MySQL, and
the Laravel queue worker). One droplet keeps it cheap (~$6–12/mo) and simple.

> **Important:** the frontend must run as a **Node server** (`next start`), not static
> files, because `/username` pages are dynamic.

---

## 1. Create the droplet

1. DigitalOcean → **Create Droplet** → Ubuntu **24.04 (LTS)**.
2. Size: **$6/mo (1 vCPU / 1 GB RAM)** to start. Upgrade to $12/mo if you add staging.
3. Region: nearest to your users.
4. Add an **SSH key** (recommended) or use a root password.
5. Create. Note the droplet **IP**.
6. Point your **domain** (e.g. `roicard.com`) at the droplet IP:
   - `A` record → droplet IP
   - `www` `CNAME` (or `A`) → same IP

## 2. First SSH + DNS sanity

```bash
ssh root@YOUR_IP
# optional but recommended:
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

Check DNS has propagated:
```bash
dig +short roicard.com
# should print YOUR_IP
```

## 3. Provision the server

Copy the provisioning script and run it (installs PHP 8.3, Composer, MySQL 8,
Node 20, pm2, Nginx, and base tools). Takes ~5 minutes.

```bash
# from your local machine, after cloning the repo onto the droplet:
sudo bash /var/www/roicard/deploy/provision.sh
```

## 4. Set up MySQL

```bash
sudo mysql_secure_installation
sudo mysql
```

```sql
CREATE DATABASE roicard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'roicard'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON roicard.* TO 'roicard'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 5. Get the code onto the server

```bash
cd /var/www
sudo git clone https://github.com/Newthin/Roicard.git roicard
cd roicard
sudo mkdir -p storage/app/public storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
sudo chown -R www-data:www-data storage bootstrap/cache
```

## 6. Configure the backend

```bash
cd /var/www/roicard
sudo cp deploy/.env.production.example .env
sudo nano .env        # fill in DB credentials, APP_URL, Google OAuth, Paystack, mail
sudo -u www-data php artisan key:generate
sudo composer install --no-interaction --optimize-autoloader --no-dev
sudo -u www-data php artisan migrate --force --seed
sudo -u www-data php artisan storage:link
sudo -u www-data php artisan config:cache
sudo -u www-data php artisan route:cache
```

For **Google OAuth**, add your production callback as an Authorized redirect URI:
`https://roicard.com/api/auth/google/callback`. Add your account to Test users until
the OAuth app is published.

## 7. Build + serve the frontend

```bash
cd /var/www/roicard/client
sudo npm ci
# NEXT_PUBLIC_API_URL is set by the systemd unit to https://roicard.com/api
sudo npm run build
```

## 8. Enable services

```bash
sudo cp /var/www/roicard/deploy/roicard-worker.service /etc/systemd/system/
sudo cp /var/www/roicard/deploy/roicard-frontend.service /etc/systemd/system/
sudo nano /etc/systemd/system/roicard-frontend.service   # replace DOMAIN with your domain
sudo systemctl daemon-reload
sudo systemctl enable --now roicard-worker roicard-frontend
sudo systemctl status roicard-worker roicard-frontend
```

Enable the **scheduler cron** so the daily `users:purge` (data retention) runs:

```bash
sudo crontab -u www-data -l 2>/dev/null | grep -q 'artisan schedule:run' || \
  (sudo crontab -u www-data -l 2>/dev/null; echo "* * * * * cd /var/www/roicard && /usr/bin/php artisan schedule:run >> /dev/null 2>&1") | sudo crontab -u www-data -
```

> Data retention: deleted accounts (self or admin) are soft-deleted and kept
> for `DATA_RETENTION_DAYS` (default 30) before `users:purge` permanently
> removes them. Run `sudo -u www-data php artisan users:purge` to trigger a
> purge immediately, or `--days=N` to override the window.

> The Next.js server listens on `127.0.0.1:3000`; Nginx proxies to it.

## 9. Configure Nginx + HTTPS
```bash
sudo cp /var/www/roicard/deploy/nginx.conf /etc/nginx/sites-available/roicard
sudo nano /etc/nginx/sites-available/roicard    # replace every DOMAIN with your domain
sudo ln -s /etc/nginx/sites-available/roicard /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Enable HTTPS with Let's Encrypt (this auto-edits the Nginx config):

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d roicard.com -d www.roicard.com
```

## 10. Deployments (updates)

```bash
cd /var/www/roicard
sudo git pull
sudo composer install --no-interaction --optimize-autoloader --no-dev
sudo -u www-data php artisan migrate --force
sudo -u www-data php artisan config:cache && sudo -u www-data php artisan route:cache
cd client
sudo npm ci && sudo npm run build
sudo systemctl restart roicard-frontend roicard-worker
```

## Troubleshooting

| Problem | Check |
| ------- | ----- |
| `502 Bad Gateway` on frontend | `sudo systemctl status roicard-frontend`; Next.js crashed? rebuild with `sudo npm run build` |
| `502 Bad Gateway` on `/api` | PHP-FPM socket: `sudo systemctl status php8.3-fpm`; confirm path in nginx.conf matches |
| Migrations fail | MySQL running? `sudo systemctl status mysql`; credentials in `.env` correct? |
| Queue jobs not running | `sudo systemctl status roicard-worker`; logs: `sudo journalctl -u roicard-worker -e` |
| Google login fails | Callback URL in Google console must match `GOOGLE_REDIRECT_URI` exactly (with trailing path) |
| Files/media 404 | `php artisan storage:link`; check `MEDIA_DISK=public` |

## Firewall (if ufw enabled)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'    # opens 80 + 443
sudo ufw enable
```
