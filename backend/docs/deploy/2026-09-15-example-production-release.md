# Production release 2026-09-15

**From:** production @ `0000000` (v1.0.0)
**To:** staging @ `1111111` (v1.1.0)
**Release PR:** #10

## What ships (by area)

| Area | PR | Summary |
|---|---|---|
| Users | #4 | Profile completion endpoint and edit cooldown |
| Notifications | #6 | Admin broadcasts to all users or by status |
| Ops | #8 | `MAIL_LOGO_URL` for branded emails |

## Infrastructure prerequisites

- New env var `MAIL_LOGO_URL` (optional; empty renders the app name as text).
- No new queues or workers.

## Deploy steps

1. Merge the release PR into `production`.
2. Pull the image and run `docker compose -f docker-compose-prod.yml up -d --build`.
3. `docker compose exec app php artisan migrate --force`.
4. Bump `APP_VERSION` to `v1.1.0` in the production environment and restart.
5. Verify `GET /` with the `X-Status-Token` header reports `v1.1.0`.

## Rollback

Redeploy the previous image; the migrations in this release are additive and
need no down.
