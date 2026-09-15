# Backend workspace

A Laravel API project template with the hardening and conventions of a
production service already in place. Copy it, set `.env`, and start on features.

## Layout

| Path | What it is |
|---|---|
| `project/` | The Laravel application (all `composer`, `artisan`, `npm` commands run here) |
| `docker-compose*.yml`, `ops/` | Container orchestration: php-fpm + nginx (OpenSearch optional) |
| `docs/` | Design specs, implementation plans, frontend handoffs, deploy runbooks, QA plans |
| `findings/` | Security-audit artifacts (git-ignored; see its README) |
| `CLAUDE.md` | The engineering conventions every change follows |
| `TODO.md` | Deferred work, grouped by area |

## What is included

- Two Sanctum guards: `administrators` (roles and permissions via spatie) and `users`
  (registration, email/SMS OTP, 2FA, profile, contacts, password lifecycle)
- Audit log, auth-attempt log, and outbound-connection log on monthly tables, with an
  optional OpenSearch read path
- PII encryption with blind indexes, PII-access auditing, trusted proxies, throttling,
  CORS allowlist, Turnstile, disposable-email checks
- In-app notification center, admin broadcasts, Reverb channel auth
- Runtime feature flags with maintenance mode
- File uploads (S3 + optional CloudFront signing), a small CMS (contents,
  documentations, galleries), PSGC address reference data
- OpenAPI via PHP attributes, PHPUnit suite on SQLite, Pint, GitHub Actions CI

## Getting started

```bash
cp .env.example .env
cd project && cp .env.example .env && composer install && php artisan key:generate
```

See `project/README.md` for the rest.
