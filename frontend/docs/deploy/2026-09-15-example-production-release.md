# Production release 2026-09-15

**From:** production @ `0000000` (v1.0.0)
**To:** staging @ `1111111` (v1.1.0)
**Release PR:** #10

## What ships (by area)

| Area | PR | Summary |
|---|---|---|
| Dashboard | #4 | Complete-profile action on the account dashboard |
| Notifications | #6 | Live bell over Reverb |

## Infrastructure prerequisites

- New build arg `NEXT_PUBLIC_REVERB_HOST` (the websocket host, public).
- The backend's `REVERB_ALLOWED_ORIGINS` and `CORS_ALLOWED_ORIGINS` must list
  this app's origin.

## Deploy steps

1. Merge the release PR into `production`.
2. `docker compose build --build-arg NEXT_PUBLIC_REVERB_HOST=ws.example.com`
   (every `NEXT_PUBLIC_*` value is inlined at build time — see the Dockerfile).
3. `docker compose up -d`.
4. Open `/` and `/admin/login`; confirm the bell connects (no console errors).

## Rollback

Redeploy the previous image; the app is stateless.
