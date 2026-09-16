# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

This is the backend half of a two-part template. The root `../CLAUDE.md` holds the cross-cutting rules (contract checks against the frontend, the hard branch rules, session notes) — read it first, then this file.

## Repository Layout

This is a Dockerized workspace, not a bare Laravel app. Two levels matter:

- **Workspace root** (this directory) — Docker orchestration and documentation: `docker-compose*.yml`, `ops/` (Dockerfiles + service config for fpm/nginx), root `.env` (Compose variables like `COMPOSE_PROJECT_NAME`, ports), `docs/`, `TODO.md`, `findings/`.
- **`project/`** — the Laravel application. All PHP, routes, migrations, tests, and the app-level `.env` live here. `composer`, `php artisan`, and `npm` commands run from inside `project/`.

**Design docs live at the workspace-root `docs/superpowers/`** (`plans/` + `specs/`) — the single canonical location. Run brainstorming/planning from the workspace root so new specs land here; do not create a second `project/docs/`. See `docs/README.md` for the full documentation taxonomy (deploy runbooks, QA plans).

## Tech Stack

- **PHP 8.3+** (Docker image builds on `php:8.4-fpm-alpine`)
- **Laravel 13** framework
- **nginx** — reverse proxy in front of PHP-FPM (see `ops/docker/nginx/`)
- **SQLite** default DB for local/testing; the fpm image also bundles `pdo_mysql` and `redis` extensions for other environments
- **PHPUnit 12** for testing; **Laravel Pint** for code style
- **Laravel Sanctum** bearer tokens on two guards: `administrators` (`api/v1/administrator/*`) and `users` (`api/v1/user/*`); `spatie/laravel-permission` for admin roles and permissions
- **owen-it/laravel-auditing** for the audit trail; **laravel/scout** + OpenSearch drivers for the optional search read path; **laravel/reverb** for WebSockets
- **darkaonline/l5-swagger** for OpenAPI docs (see *API Documentation* below)
- **Vite 8 + Tailwind CSS 4** for frontend assets (the API itself has no UI)

## Commands

Run all `composer`/`php artisan`/`npm` commands from inside `project/`.

```bash
composer setup                             # install deps, env, key, migrate, build assets
composer dev                               # server + queue + log tail + vite via concurrently

composer test                              # clears config, then runs the suite
php artisan test                           # run all tests
php artisan test --filter=SomeTestName     # run a single test by name
php artisan test tests/Feature/ExampleTest.php
php artisan test --testsuite=Unit          # or Feature

./vendor/bin/pint                          # format code
./vendor/bin/pint --test                   # check without modifying

php artisan pail                           # tail application logs
php artisan l5-swagger:generate            # regenerate the OpenAPI JSON
```

Docker (from the **workspace root**):

```bash
docker compose up -d        # start app (PHP-FPM) and nginx
docker compose exec app sh  # shell into the app container (working dir /var/www/html)
```

The web server is exposed on `COMPOSE_WEBSERVER_PORT` (default `8000`).

## Container Runtime

The `app` container boots via `project/entry-point.sh`, which on every start:

1. `composer dump-autoload`
2. `php artisan optimize` — cache config/routes/views
3. When `SCOUT_DRIVER=opensearch`: `opensearch:apply-lifecycle` and `opensearch:migrate` (both `|| true`, so an unreachable cluster never blocks boot)
4. `pm2 start queue-workers.json` — launch background workers under pm2
5. `php artisan test:logger "Container started"` — a boot notice through the log pipeline
6. `php-fpm`

`project/queue-workers.json` defines the pm2-managed processes: **worker-scheduler** (`schedule:run` every minute), **worker-default** (`queue:work`), dedicated per-queue workers **mailer**, **audit**, **connection**, **search**, and **reverb-server**. **A new dedicated queue needs a matching `worker-*` entry here.** The default queue and scheduler both rely on the DB connection (`QUEUE_CONNECTION=database`).

Logs default to file; a `cloudwatch` channel (`config/logging.php` → `App\Logging\CloudWatchLoggerFactory`) ships them to AWS CloudWatch when enabled per environment via `LOG_STACK=single,cloudwatch`. It is IAM-role-safe and wrapped so a CloudWatch outage never breaks a request.

## Modules

- **Administrators** — auth (email + password, optional email-OTP 2FA), sliding-inactivity + absolute-lifetime token ceilings (`refresh.token`), temporary-password gate (`password.changed`), admin CRUD with self-escalation guards (`protect.administrator`), roles/permissions with permission groups (`PermissionEnum`, `AccessSeeder`), a sealed Super Admin role (`protect.super-admin-role`), and a virtual `developer-access` token ability granted only to `is_developer` admins (gates the feature-flag API).
- **Users** — website self-registration (email OTP, verify-before-create, anti-enumeration), login with email-OTP 2FA and trusted devices, forgot/reset password, profile (`draft` → `completed` with an edit cooldown; `mobile_number` is a plain, unverified contact field), password-confirmed account deletion with a recovery window. Email is the only authentication channel — there is no SMS delivery. PII is encrypted (`EncryptsPii`) with keyed-HMAC blind indexes.
- **OTP** — `OtpService` with cooldown, resend and attempt lockouts; delivered by mail (`config('otp.mailables')`) through the queued `SendOtp` listener.
- **Notifications** — an in-app notification center per user (`Notification` model, `NotificationCopy` renders titles at read time from `config('app.name')`), realtime push on the user's private channel, admin **broadcasts** (all users, by status, or one uuid) via the queued `SendBroadcast` job, pruned after `NOTIFICATION_RETENTION_MONTHS`.
- **Logs** — audit trail (`Audit`), auth attempts (`AuthAttempt`), outbound connections (`Connection`) on **monthly tables** (`HasMonthlyTable`, pre-created by the `*:prepare-next-table` commands), read-only admin viewers gated per type, and `log.pii-access` auditing every full-PII read. Connection and auth-attempt logs write through the `mysql-logs` connection, which falls back to the primary `DB_*` database unless `DB_LOGS_*` is set. Every outbound HTTP call goes through a `ConnectionService` subclass so it is logged with secrets and PII masked.
- **OpenSearch (optional)** — with `SCOUT_DRIVER=opensearch` the logs, users and notifications are mirrored into OpenSearch (`SearchableLog`, `SearchableUser`), lists read from it with a MySQL fallback (`OPENSEARCH_READ_ENABLED`), and an ISM lifecycle rolls log indices over. **Adding a document field means updating `toSearchableArray()` and `searchableMapping()` together.**
- **Files** — uploads to Cloudflare R2 on two disks: `r2` (private bucket, served by cached S3 presigned URLs, `R2_PRIVATE_URL_TTL`) and `r2-public` (public bucket, served from its custom domain `R2_PUBLIC_URL`). `File::diskFor()` picks the disk from visibility and the `disk` column records it; galleries live on the public disk. `OwnedFileRule` for IDOR-safe references, MIME/size/threat validation. `R2_*` env keys are deliberately separate from `AWS_*` (CloudWatch).
- **Feature flags** — a whitelisted registry in `config/feature-flags.php` mapping each flag to its config fallback; cache-backed shared store; `maintenance_mode` puts the user surface (and the non-developer admin surface) into 503. Caveat: a cache flush reverts every flag to its fallback.
- **CMS** — contents, documentations, galleries (admin CRUD + public read).
- **Addresses** — PSGC reference data (countries, regions, provinces, municipalities, barangays) seeded by `AddressSeeder`; `HasAddress` resolves a model's address.
- **Hardening** — `ForceJsonResponse`, `throttle:api` on the whole API group, trusted proxies (`App\Http\TrustedProxies` + `TRUSTED_PROXIES`), exact CORS allowlist, Turnstile captcha, disposable-email blocklist, `SsrfGuard` for server-side fetches, `APP_DEBUG` and Swagger forced off in production, `PiiKeyGuard` refusing to boot in production without `PII_ENCRYPTION_KEY`.

## Local Development (live reload)

`docker-compose.yml` mounts `./project` into the `app` container, so file edits are visible immediately:

- **PHP code**: reloads live (`opcache.validate_timestamps=1` in the `develop` image).
- **Cached config/routes**: `entry-point.sh` runs `php artisan optimize` on start; run `php artisan optimize:clear` inside the container after config/route changes.
- **Image config** (`user.ini`, `www.conf`, nginx confs, Dockerfiles): requires `docker compose build`.

## Testing Notes

- Tests run against an in-memory SQLite database; `project/phpunit.xml` pins every env value the suite depends on (`APP_KEY`, `PII_ENCRYPTION_KEY`, drivers set to `array`/`sync`/`null`), so **the suite needs no `.env`**.
- Two suites: `tests/Unit` and `tests/Feature`. Feature tests boot the framework via `tests/TestCase.php` (auditing disabled by default; role id 1 reserved for Super Admin).
- External services are faked: S3 uses `Storage::fake`, OpenSearch clients are mocked.
- Convention-guard tests exist alongside behaviour tests (`NotificationBrandingTest`, `EmailFooterTest`, `NotificationCopyTest`, the `*SearchableTest`s asserting document and mapping keys match). Extend them when adding a notification, a mail, or an indexed field.
- Run the suite on the host from `project/` (`php artisan test`), not inside the container.

## API Documentation (Swagger)

API docs are generated by **`darkaonline/l5-swagger`** from **PHP 8 OpenAPI attributes** (`#[OA\...]`, `use OpenApi\Attributes as OA;`). swagger-php 6 is **attributes-only** — docblock `@OA\` annotations are not supported.

- **One documentation per API group** (`administrators`, `users`, `common`), configured in `config/l5-swagger.php`, each scanning only its group's files and served at `/api/documentation/<group>`. `/api/documentation` is the landing page listing every group.
- Per group: a doc-root class (e.g. `Administrators\AdministratorsApiDoc`) holds `#[OA\Info]`, `#[OA\Server]`, `#[OA\Tag]`, and shared schemas (`ErrorEnvelope`, the error variants); response schemas live on the Resource; each operation is annotated on its single-action controller's `__invoke`.
- Regenerate with the group as a positional argument: `php artisan l5-swagger:generate administrators`. Generated JSON in `storage/api-docs` is gitignored.
- **Adding or changing an endpoint means updating its OpenAPI attributes in the same change.**
- **Swagger UI operation order is manual**, via the `operationsSorter`/`tagsSorter` order arrays in `resources/views/vendor/l5-swagger/index.blade.php`; unlisted operations sort alphabetically after the listed ones.
- **Document every possible error response** with a realistic example; where one status has several variants use multiple named `#[OA\Examples(...)]`.
- **Reserve `422` for validation only** (Laravel's `{message, errors}` shape). Domain/business exceptions (`CustomException` subclasses) return **`400`** with `{error, message, error_description, meta?}`; structured detail (`remaining_attempts`, `retry_after`, `locked_until`) goes in `meta`.
- **Every OpenAPI property/parameter carries a sample `example`.** Exception: optional list-filter query params (`search`, `status`, `per_page`, …) carry none — Swagger UI pre-fills examples and would silently filter a bare list request; put the sample in the `description` instead.

## Engineering Principles

- **KISS** — Prefer the most straightforward solution that works. Don't add layers, abstractions, or config the problem doesn't demand.
- **DRY** — Extract shared logic instead of copy-pasting; reuse existing helpers, services, and Laravel features.
- **YAGNI** — Build only what the current requirement needs. No speculative options, hooks, or "just in case" flexibility.

## Security review (every change)

**Before opening a PR, self-review the diff against this checklist.** Treat each item as a question to answer for the change, not a box to tick blindly. If a change introduces a new class of risk worth enforcing, add an item here in the same PR.

- **Authorization / IDOR** — Any endpoint that accepts a resource reference (a `uuid`, a file `uuid`, an `id`) must verify the caller may access *that* object, not merely that it exists. A new file-`uuid` input uses `OwnedFileRule` (it resolves the acting principal across both guards). Only enforce ownership when a value actually **changes** — re-submitting an unchanged reference must still pass. Compare morph keys as strings, never `(int)` (a UUID key would collapse to `0`).
- **Privilege escalation (both directions)** — Granting a role/permission requires the actor to already hold it (`GrantableRoleRule`/`GrantablePermissionRule`); a **sync** that *removes* one must run the same check, or a lower-privilege admin can strip a peer. The Super Admin role/account stays sealed over HTTP.
- **Secrets & PII at rest / in transit** — Never log PII or credentials: add new personal-data field names to `ConnectionService::PII_KEYS` (and secrets to `SECRET_KEYS`), not a per-subclass list. A queued job/listener carrying a secret (temp password, OTP PIN) implements `ShouldBeEncrypted`. PII columns use `EncryptsPii` — a failed decrypt **fails closed on writes** (`PiiDecryptException`) so a wrong key never lets a save destroy the row; reads degrade to null. Read secrets via `config(...)` — **never `env()` outside a config file**.
- **Data exposure in responses** — API resources must not leak the internal `id` or unmasked contact PII where it isn't intended. List endpoints mask contact PII (`PiiMasker`) and drop birth_date/gender; the full record is only on the single-record **show**, whose read is audited (`log.pii-access`). Keep `422` for validation only; domain errors use the `400` envelope and never leak internals.
- **Server-side fetches (SSRF)** — Any URL fetched server-side goes through `SsrfGuard`: https-only, every resolved IP (A **and** AAAA) public, the validated IP pinned for the request, redirects disabled. Downloaded bytes are validated (real MIME, size cap, threat scan) before use.
- **Rate limiting** — Auth-style, OTP, and enumeration-prone endpoints carry a named `throttle:` limiter, keyed per the existing pattern (IP for anonymous auth; the account key where the route is authenticated and guards a guessable secret; the normalized email for shared-NAT crowds).
- **Auth lifecycle** — A password change or reset clears 2FA state and tokens (`resetTwoFactorState()` + `logout()`), so a stolen session dies with the password. Respect token inactivity + absolute-lifetime ceilings.
- **Config & deploy** — `APP_DEBUG` and the Swagger docs are forced off in production; CORS is an exact allowlist. When touching `composer.json`, run `composer audit` for known CVEs.

## Rules

- **Never edit `.env` files.** The actual env files hold environment-specific secrets the user owns. When a change needs a new or updated env value, update the tracked **`.env.example`** template and tell the user what to set.
- **URL paths are kebab-case.** Every route path segment and OpenAPI `path:` value uses `kebab-case` — e.g. `two-factor-authenticate`, `change-password`, `sync-roles` — never `snake_case` or `camelCase`, action/RPC segments included. **Request/response body fields stay `snake_case`.** Test-only `/__*` fixture routes are exempt.
- **Never use fully-qualified class names (FQN) inline.** Import at the top and use the short name. Do not write `\App\Models\Users\User::find()`.
- **Always add docblocks.** Every class and method gets a PHPDoc block describing its purpose (test classes and methods included).
- **Never use `unique()` constraints in migrations.** Enforce uniqueness in Form Request validation, scoped to non-trashed rows where the model soft deletes (`Rule::unique(...)->whereNull('deleted_at')`).
- **Never use foreign key constraints in migrations.** Index the referencing column instead; the application manages referential integrity.
- **Editing a published package migration is acceptable.** Publish a vendor migration and edit it in place to match these conventions rather than layering alter-migrations.
- **Always index columns inline.** Chain `->index()` on the column definition; prefer individual inline indexes over composite `$table->index([...])`.
- **Never use a `json` column type — always `text`** with an Eloquent `'array'` cast.
- **Always index `deleted_at` inline** on soft-deleting tables: `$table->softDeletes()->index();`.
- **Always register new models in the morph map** (`Relation::enforceMorphMap(...)` in `AppServiceProvider::boot()`) by short class name. An unmapped model throws.
- **Co-locate Requests and Resources with their model** under `app/Models/<Module>/Requests` and `app/Models/<Module>/Resources`.
- **Keep controllers thin.** One invokable controller per endpoint (`ListXController`, `StoreXController`, …). If an action performs more than one logical step, extract it into a model or domain method. Controllers validate, delegate, and return.
- **Don't use `abort()`/`abort_if()` for not-found.** Resolve through a `*OrFail` query/domain method that throws `ModelNotFoundException`; the exception handler renders the 404.
- **API resource formatting.** Return booleans as integers (`1`/`0`) and datetimes as `Y-m-d H:i:s` (null-safe: `$this->created_at?->format('Y-m-d H:i:s')`). Keep the `#[OA\...]` schema types/examples in sync.
- **Always format timestamps in every JSON response** as `Y-m-d H:i:s` — including exception `meta`. Never emit ISO-8601.
- **The `api` group has a default limiter — new routes are throttled by default.** `throttle:api` (keyed per authenticated principal, else IP; `API_RATE_LIMIT`, default 60/min; CORS preflight exempt) is on the `api` middleware group, so a route that forgets its own limiter still fails safe. Named per-route limiters stack on top as independent buckets.
- **Rate-limit auth-style endpoints by client IP.** Define named limiters in `AppServiceProvider::boot()` keyed on `$request->ip()` and apply via `->middleware('throttle:<name>')`. Throttle rejections render the `too_many_requests` (429) envelope. `$request->ip()` is the real caller only because `config/trustedproxy.php` + `TRUSTED_PROXIES` trust the real hops — keep that list current per environment.
  - **Exception — key on the account where the endpoint is already authenticated and guards a guessable secret**, so each guess costs an account rather than an IP. Use this only behind an auth guard.
- **A queued job or listener carrying a secret must implement `ShouldBeEncrypted`.** A queued listener serialises its event into the `jobs` table, so a secret on that event sits in the database in plaintext until the job runs — and indefinitely in `failed_jobs` if it doesn't.
- **Never log PII from an external API.** `ConnectionService` masks `PII_KEYS` and `SECRET_KEYS` in the **base client**, so a new connection logger is safe by default. Add new field names there, not to a subclass's `$maskKeys`.
- **Notification copy names the platform from `config('app.name')` — never hardcode it.** Every recipient-facing string (mail bodies, subjects) interpolates the app name, and the surrounding copy stays article-free. `NotificationBrandingTest` guards this.
- **Always keep documentation in sync with changes.** Update this `CLAUDE.md`, `TODO.md`, the specs/plans under `docs/superpowers/`, and the OpenAPI attributes in the same change.
- **Capture deferred work in `TODO.md`.** Whenever something is put off, add a `TODO.md` entry in the same change so nothing deferred is lost.
- **Develop features with the Red → Green → Blue (TDD) cycle:**
  1. **🔴 Red** — Write one failing test describing the desired behavior. Run it and watch it fail for the *right* reason.
  2. **🟢 Green** — Write the minimum production code to make that test pass. Keep the rest of the suite green.
  3. **🔵 Blue (Refactor)** — Clean up with tests staying green. Add no new behavior in this phase.

  The Iron Law: no production code without a failing test first.

## Branching & Pull Requests

- **`develop` is the working branch.** All ongoing work targets `develop`. It is branched from `main` once the template's initial setup lands; until then feature branches go off `main` (see the root `CLAUDE.md`).
- **Every update goes through a pull request into `develop`** — do not commit straight to `develop`. The only exception is an explicit user instruction.
- **Release flow: `develop` → `staging` → `production`.** Promotions to `staging` are cherry-picks of the develop merge commits (`git cherry-pick -x -m 1 <merge>`) on a `release/staging-YYYY-MM-DD*` branch, PR'd into `staging`. Releases to `production` are a plain `staging → production` PR with the deploy steps in the body (see `docs/deploy/`).
- **`config('app.version')`'s default is bumped only on the `production` branch**, as a direct commit after each release. `APP_VERSION` overrides it per environment.
- **Never merge a PR without the user's explicit go-ahead.** Open the PR and stop; the merge is the user's call, per PR, every time.
- If the repository runs an automated review bot, read its comments and resolve every real one before a PR is merged — a green PR with unaddressed findings is not ready.
