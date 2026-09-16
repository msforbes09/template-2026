# TODO

Deferred work, grouped by area. Every open item says *why* it is deferred.
Done items stay, rewritten into a dense paragraph of what shipped (endpoints,
classes, deploy notes, spec link), so this file doubles as a changelog. Whenever
something is put off in a design or a review, add it here in the same change.

## Authentication & Authorization

- **Done (2026-09-16):** password history and minimum age on both guards. `password_histories` (morph `owner`, hash per set, pruned to `PASSWORD_HISTORY_LIMIT`, default 5) and `password_changed_at` on `administrators` and `users`, both maintained by `HasPasswordHistory` model events so every set path is covered; the migration backfills from the current hash and `updated_at`. `NotRecentlyUsedPassword` on the admin change, user change and user reset requests (`422` on `new_password`); `assertPasswordOldEnoughToChange()` in `changePassword()` / `updatePassword()` throws `password_changed_too_recently` (`400`, `meta.available_at`) inside `PASSWORD_MIN_AGE_HOURS` (default 24) — temporary-password changes and OTP resets exempt. Reset-to-current-password is now the `422` reuse error rather than `password_unchanged`.
- **Done (2026-09-16):** administrator password expiry with postponements. `password_expiry_waives` on `administrators` (reset to 0 whenever the password changes, in `Administrator::booted()`); `passwordExpiresAt()` = `password_changed_at` + `ADMIN_PASSWORD_EXPIRY_DAYS` (default 90, 0 disables); `EnsurePasswordChanged` also throws `password_expired` (`403`) when expired with no waives left; `POST administrator/password/waive-expiry` (`WaivePasswordExpiryController`, inside the authenticated group but outside `password.changed`) uses one of `ADMIN_PASSWORD_EXPIRY_MAX_WAIVES` (default 3) or answers `password_expiry_waive_unavailable` (`400`). The profile resource exposes `password_changed_at`, `password_expires_at`, `is_password_expired`, `password_expiry_waives_remaining`; the frontend gate and dashboard banner key off those.

- **Done (2026-09-16):** session window exposed for the idle-timeout UI. `AdministratorProfileResource` and `UserProfileResource` carry `session_inactivity_minutes` (from `auth.<guard>.token_inactivity_minutes`) and `token_expires_at` (`Authenticates::tokenExpiresAt()`, coerced to null when the current token is Sanctum's `actingAs()` mock). No new endpoint: `GET profile` is the keep-alive, since the refresh middleware slides the expiry on any authenticated request.
- **Deferred:** active-sessions list with per-session and revoke-all endpoints (`GET/DELETE administrator|user/sessions`). Both guards run single-session today (`Authenticates::authenticate()` deletes every prior token), so there is never more than one row to show. Revisit if multi-device sessions are ever allowed.

## Users

## Files

- **Done (2026-09-15):** file storage moved from S3 + CloudFront to Cloudflare R2. Two disks (`r2` private, `r2-public` public) on the S3 driver; `File::diskFor()` picks by visibility and the `disk` column records it. Private URLs are cached S3 presigned URLs (`R2_PRIVATE_URL_TTL`, signed ttl+300s); public URLs are `R2_PUBLIC_URL` + path. `CloudFrontSigner` deleted. Galleries moved to the public disk under `gallery/`. Spec: `docs/superpowers/specs/2026-09-15-r2-file-storage-design.md`.
- **Deferred:** direct-to-R2 browser uploads via presigned PUT — not needed while uploads stay ≤10 MB images through the API.
- **Deferred:** placeholder image for pruned files. The `iam4bs-private` and `iam4bs-public` buckets carry a bucket-wide R2 lifecycle rule that deletes objects 60 days after upload (galleries under `gallery/` included). A `File`/`Gallery` row can therefore outlive its object; the UI should fall back to a placeholder served from the manually-managed `iam4bs-assets` bucket (`assets.iam4bs.dev`). Deferred until the placeholder asset exists.
- **Deferred:** CDN/custom domain for private files. R2 custom domains are plain public access and presigned URLs only work against the S3 API host, so the private bucket has no custom domain. If caching or a branded host is ever needed, put a Worker (token check + stream from the bucket binding) or Cloudflare Access in front. Not needed for profile photos.

## Administrators

## Notifications & Email

## Logging & Auditing

## Security review follow-ups

## Configuration

## Observability

- **Deferred:** request correlation id. Accept or generate an `X-Request-ID` per request, echo it in the response, and stamp it on every log line and log-table row written while handling it, so one id ties a user report to its trace across the audit, auth-attempt and connection logs in OpenSearch. Frontend would surface it in error toasts as a support reference. Deferred until production logs need cross-table tracing; nothing depends on it yet.

## Deployment / CI-CD

## Ops / Docker

- **Done (2026-09-16):** queue workers moved from five pm2 `queue:work` processes to Laravel Horizon on Redis (`config/horizon.php`, one supervisor per environment over `default, mailer, audit, connection, search`); queue, cache and sessions on Redis; dashboard on its own nginx listener (`COMPOSE_HORIZON_PORT`) gated by a signed handoff from the admin console (`POST administrator/horizon/access`, developer-access). Redis stays outside the compose stack by decision. Spec: `docs/superpowers/specs/2026-09-16-horizon-design.md`.
- **Deferred:** Horizon notifications (long-wait alerts to Slack/mail) — no channel chosen yet.

## API Documentation

## Realtime / Broadcasting

## Cleanup

## Future
