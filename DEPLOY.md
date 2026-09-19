# Putting Imation on Hostinger

The site is a static React app plus a small PHP API — the same pattern as
talal-tech.com. It runs on any Hostinger plan (Single, Premium, Business).
No Node.js or Composer needed on the server.

## 1. Create the database

hPanel → **Databases → MySQL Databases**. Create a database and a user, and
note the four values (host is normally `localhost`).

Then hPanel → **phpMyAdmin** → your database → **Import**, and run:

- `server/schema.sql` — creates the tables

There is no seed file for production: the shop starts with an empty
catalogue and you add categories, products and your branding through the
admin panel after the first login (step 5).

## 2. Build the site

On your computer:

```bash
npm install
npm run build
```

That writes everything into `dist/` (this includes `.htaccess` and an
`uploads/.htaccess`, copied from `public/`).

## 3. Upload

Using hPanel → **File Manager** (or FTP), into `public_html`:

| Upload | To |
| --- | --- |
| everything **inside** `dist/` | `public_html/` |
| `server/api/` | `public_html/api/` |
| `server/lib/` | `public_html/lib/` |
| `server/create-admin.php` | `public_html/create-admin.php` (deleted again in step 5) |

**Do not upload the rest of `server/`.** On your computer that folder also
holds local-development files that must never reach the server:

- `server/data/` — the local SQLite database, if you ran it locally
- `server/config.php` — your local config; the server gets its own in step 4
- `server/router.php`, `server/local-sqlite-init.php`, `*.sql`

The `.htaccess` refuses to serve any of these if they land there by mistake,
but the safe move is to never upload them.

Layout on the server:

```
public_html/
  index.html          ← from dist/
  assets/              ← from dist/
  .htaccess            ← from dist/
  uploads/             ← from dist/ (holds only .htaccess until the first
                          photo is uploaded); must be writable (755)
  api/                 ← from server/api/
  lib/                 ← from server/lib/
  config.php           ← your copy of server/config.example.php (step 4)
  create-admin.php     ← from server/ (delete after step 5)
```

## 4. Configure

Copy `server/config.example.php` to `config.php` next to `lib/`, and fill in
the database name, user and password from step 1.

`config.php` is git-ignored — it holds your database password, so it never
goes into version control.

## 5. Create your admin login

Visit `https://yourdomain.com/create-admin.php`, pick a username and a
password of at least 8 characters. Do this **before** telling anyone the
site is live — the temporary local login is `admin` / `admin` and only
exists in local development, never in the shipped code.

**Then delete `create-admin.php` from the server.** It refuses to run once
an account exists, but there is no reason to leave it there.

## 6. Sign in and fill in the shop's real details

`https://yourdomain.com/#/admin/login`

Go to **Settings** first and fill in:

- The real logo (the current one is a placeholder that fails to load)
- Phone numbers, Instagram, Facebook, TikTok
- The Google Maps link
- The About text in all three languages

Then go to **Categories** and **Products** to build the real catalogue —
there is nothing pre-loaded on the live site.

## 7. Turn on HTTPS

hPanel → **Security → SSL**, turn on the free certificate. The admin session
cookie is marked `secure` automatically once the site is served over HTTPS.

## Notes

- **Prices are in Iraqi dinar (IQD)** everywhere — no currency switcher.
- **The admin session** is a real per-browser login (httpOnly cookie), not a
  shared flag — logging in on one device does not log anyone else in.
- **Ten wrong password attempts** from the same address or against the same
  username lock that address/account for 15 minutes.
- **Product photos** uploaded through the admin land in `uploads/`.
- **Deleting a category or product** now actually deletes it. A past order
  keeps showing the product's name, photo and price as they were at the
  time of purchase either way, since that is copied into the order at
  checkout — editing or removing a product later never changes old orders.

## Updating the site later

Only the front end needs rebuilding:

```bash
npm run build
```

Then re-upload the contents of `dist/`. The database and `uploads/` are
untouched, so your products, orders and photos stay as they are. If you add
a new PHP file under `server/api/` or `server/lib/`, upload that file too.
