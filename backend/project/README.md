# Backend (Laravel API)

The Laravel application of this workspace. Docker orchestration, docs, and the
working conventions live one level up (see the workspace `README.md` and
`CLAUDE.md`).

## Requirements

- PHP 8.3+ with `pdo_sqlite`, `pdo_mysql`, `mbstring`, `intl`
- Composer 2
- Node 20+ (only for Vite assets; the API itself has no frontend)

## First run

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Then set in `.env` at least: `APP_NAME`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`
(the seeded super administrator), and `PII_ENCRYPTION_KEY` (required in production;
falls back to `APP_KEY` locally). See the comments in `.env.example` for every other
switch — most features are off by default.

```bash
php artisan migrate --seed          # roles, permissions, the super admin
php artisan db:seed --class=AddressSeeder   # PSGC address reference data (once; MySQL only)
php artisan serve
```

`AddressSeeder` loads MySQL-dialect SQL dumps, so run it against a MySQL database.
On SQLite (the default local driver) the address lookups simply return empty lists.

## Tests

```bash
composer test
```

The suite runs on in-memory SQLite with everything external faked; it needs no
`.env`. Pint enforces formatting: `./vendor/bin/pint --test`.

## Docker

From the workspace root: `cp .env.example .env`, then `docker compose up --build`.
The app container runs the queue workers and the scheduler through pm2
(`queue-workers.json`) and starts via `entry-point.sh`.

## Where things are

| Concern | Path |
|---|---|
| Routes | `routes/api-routes/{administrators,users,common}/index.php` |
| Controllers (one action each) | `app/Http/Controllers/{Administrators,Users,Common}/<Feature>/` |
| Models + their Requests/Resources | `app/Models/<Module>/` |
| Cross-cutting services | `app/Services/` |
| Error envelope | `app/Exceptions/CustomException.php` |
| OpenAPI | PHP attributes on controllers and resources; `php artisan l5-swagger:generate` |
