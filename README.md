# Roicard

Professional networking platform — Laravel 12 API + Next.js 16 frontend.

## Repository Layout

```
roicard-backend-main/
├── app/              # Laravel application code (controllers, models, services)
├── client/           # Next.js 16 frontend (App Router)
├── config/           # Laravel config
├── routes/           # API route definitions
├── database/         # Migrations and seeders
├── public/           # Laravel web root
├── Dockerfile        # Laravel container
└── client/Dockerfile # Frontend container
```

## Local Development

### Prerequisites

- PHP 8.3+ (with `pdo_mysql` or `pdo_pgsql`)
- Composer
- Node.js 20+
- MySQL 8 or PostgreSQL (e.g. Supabase)
- A Google OAuth app (for Google sign-in)

### Backend (Laravel)

```bash
composer install
cp .env.example .env   # then fill in DB + Google OAuth credentials
php artisan key:generate
php artisan migrate --seed
php artisan serve --port=8000
```

API available at `http://localhost:8000/api`. A convenience script `start_backend.bat` starts the API server plus a queue worker.

### Frontend (Next.js)

```bash
cd client
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL to your API base URL
npm run dev
```

Frontend available at `http://localhost:3000`.

### Google OAuth setup

Backend `.env`:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
```

Frontend `client/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

In the Google Cloud console, add your app as an **Authorized redirect URI** for the callback URL and add your test accounts to **OAuth consent screen → Test users** until the app is published.

## Deployment

The backend is a standard Laravel app and the frontend is a standard Next.js app (server runtime — dynamic `/username` routes are rendered on demand, so **Node-server hosting** is required; static file hosting will not work).

### DigitalOcean droplet

A full step-by-step guide for a single Ubuntu 24.04 droplet (Nginx + PHP-FPM + MySQL + Node/pm2 + queue worker) is in [`deploy/README.md`](deploy/README.md). The `deploy/` folder contains:

- `provision.sh` — installs PHP 8.3, Composer, MySQL 8, Node 20, pm2, Nginx
- `nginx.conf` — routes `/api/*` to Laravel, everything else to Next.js, with HTTPS
- `roicard-worker.service` — Laravel database queue worker (systemd)
- `roicard-frontend.service` — Next.js production server (systemd)
- `.env.production.example` — production backend env template

### Generic (any host)

Backend:

1. Set the same env vars as `.env.example` on your host (DB, `APP_KEY`, `GOOGLE_CLIENT_ID/SECRET`, queue driver).
2. Run `php artisan migrate --seed`.
3. Point your web server at `public/` (or use the provided `Dockerfile`).

Frontend:

1. Build with `npm run build`.
2. Run with `npm start` (or the provided `client/Dockerfile`).
3. Set `NEXT_PUBLIC_API_URL` to the production API base URL.

### API Routes

See `routes/api.php` for the full route list (auth incl. Google OAuth, profiles, connections, payments, admin, QR, etc.).
