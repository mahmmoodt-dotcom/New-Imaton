# Imation — Computer & Electronics Shop

A trilingual (Kurdish / Arabic / English) storefront for a computer and
electronics shop in Iraq, with cash-on-delivery checkout, order tracking,
and an admin dashboard for managing categories, products, orders and shop
settings.

- **Front end:** React + Vite + Tailwind CSS
- **Backend:** plain PHP + PDO (MySQL in production, SQLite for local dev) —
  no framework, runs on any Hostinger plan
- **Default language:** Kurdish (customers can switch to Arabic or English)

See [DEPLOY.md](./DEPLOY.md) for putting this on Hostinger.

## Run it locally

You need Node.js and PHP installed.

**1. Start the API** (in one terminal):

```bash
php server/local-sqlite-init.php   # first time only — creates the local database
php -S localhost:8000 -t server server/router.php
```

**2. Start the front end** (in another terminal):

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Vite proxies `/api` and `/uploads` to the PHP
server on port 8000, so both run together without any extra configuration.

The local database seeds a temporary admin login: **admin / admin** — sign
in at `http://localhost:3000/#/admin/login`. This login only exists in local
development; production gets a real one via `create-admin.php` (see
DEPLOY.md).

## Project layout

```
App.tsx, components/, pages/     React app
store.ts                          talks to the PHP API (fetch, not Supabase)
translations.ts                   en / ar / ku strings
server/api/                       PHP endpoints (auth, catalog, orders, settings)
server/lib/bootstrap.php          shared DB connection, auth, JSON helpers
server/schema.sql                 MySQL schema (production)
server/schema.sqlite.sql          SQLite schema (local dev only)
server/config.example.php         copy to server/config.php in production
```
