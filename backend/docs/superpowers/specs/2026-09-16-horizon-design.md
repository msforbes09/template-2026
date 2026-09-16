# Laravel Horizon for queue workers — design

**Date:** 2026-09-16
**Status:** approved in discussion; implemented on `feature/horizon`

## Goal

Replace the five hand-written pm2 `queue:work` processes with Laravel Horizon on
Redis, gain its dashboard (failed jobs with retry, throughput, wait times), and
make the dashboard reachable from the admin console in every environment
without a shared credential.

## Decisions

1. **Redis is external to this workspace.** No Redis service in the compose
   files. Locally it runs from a standalone compose file outside the repo
   (`~/redis-compose/docker-compose.yml`) and the app reaches it through
   `host.docker.internal`; staging and production point `REDIS_HOST` at a
   managed Redis. Queue, cache and sessions all move to Redis in the templates.
2. **Horizon owns the queue workers.** One supervisor per environment covers
   `default, mailer, audit, connection, search` with `balance: auto`,
   `tries: 3`. The database `failed_jobs` table stays the failer so the
   `queue:failed` / `queue:retry` CLI keeps working.
3. **pm2 stays** for the processes Horizon does not own: the scheduler and
   Reverb, plus Horizon itself. `queue-workers.json` shrinks to three entries.
   The scheduler runs `horizon:snapshot` every five minutes for the metrics.
4. **The dashboard is served on its own port.** nginx gains a second `server`
   block (`COMPOSE_HORIZON_PORT`) that serves only `/horizon*` paths;
   the main port answers 404 for `/horizon`. A dev-server subdomain points at
   that port.
5. **Access is a signed handoff from the admin console.**
   `POST api/v1/administrator/horizon/access` (ability `developer-access`)
   returns a one-minute signed URL on the Horizon host
   (`HORIZON_URL` + relative signed route). Visiting it marks the session as
   Horizon-authorised and redirects to `/horizon`. The Horizon auth callback
   allows a request when the session carries that flag, or unconditionally in
   the `local` environment; otherwise 403. No credential is shared.
6. **Out of scope:** the in-console failed-jobs viewer (Horizon covers retry),
   supervisord, Horizon's tag/metrics notifications.

## Components

### Backend

- `composer require laravel/horizon`, `horizon:install`. Horizon 5.49 serves
  its dashboard assets from the package, so nothing is published or committed.
- `config/horizon.php`: `path => 'horizon'`, `use => 'default'` Redis
  connection, `middleware => ['web']`, supervisors as in decision 2;
  `local` runs 2 processes max, `staging` 4, `production` 8.
- `config/queue.php`: `redis.retry_after` default raised to 150 so it stays
  above the supervisor timeout of 120.
- `App\Providers\HorizonServiceProvider`: `Horizon::auth()` callback per
  decision 5. Session key `horizon_authorised_at`.
- `POST api/v1/administrator/horizon/access` →
  `Administrators\Horizon\CreateHorizonAccessController`: returns
  `{data: {url, expires_at}}`. `GET /horizon-access` (web, `signed:relative`)
  → `HorizonAccessController`: stores the session flag, redirects to
  `/horizon`.
- Routes: the landing path is `/horizon-access`, outside Horizon's own
  `/horizon/{view}` catch-all (which is registered first and would win) but
  under the `/horizon` prefix nginx routes to the dashboard listener. `ForceJsonResponse` stays global; it only
  sets the `Accept` header and Horizon's view still renders.
- `queue-workers.json`: `horizon`, `worker-scheduler`, `reverb-server`.
- `routes/console.php`: `horizon:snapshot` every five minutes.
- nginx: `default.conf` and `default.dev.conf` gain the second server block on
  container port 8081; the main block returns 404 for `^~ /horizon`.
- Compose files: publish `${COMPOSE_HORIZON_PORT}:8081` on nginx.
- Env templates: workspace `.env.example` gains `COMPOSE_HORIZON_PORT=8001`;
  `project/.env.example` sets `QUEUE_CONNECTION=redis`, `CACHE_STORE=redis`,
  `SESSION_DRIVER=redis`, `REDIS_HOST=host.docker.internal`,
  `HORIZON_URL=http://localhost:8001`, `REDIS_QUEUE_RETRY_AFTER=150`.

### Frontend

- `POST /horizon/access` is consumed by a server action `openHorizon` that
  redirects the browser to the returned URL. It is triggered by an
  "Open Horizon" form button on the System Controls page, rendered only for
  developer administrators. No new route, no new permission mirror.

## Tests

- Backend: Horizon auth callback (local allows; production denies without the
  session flag and allows with it); access endpoint requires
  `developer-access`, returns a URL under `HORIZON_URL` with a valid relative
  signature; the signed GET sets the flag and redirects, an unsigned GET is
  403; `queue-workers.json` has a `horizon` entry and no `queue:work`;
  `config/horizon.php` lists every dedicated queue in every environment.
- Frontend: `openHorizon` calls the endpoint as admin and redirects to the
  returned URL; a failure surfaces as an error instead of a redirect.

## Operations

- After a config or code change in a running container:
  `php artisan optimize:clear && php artisan horizon:terminate` (pm2 restarts
  it). Replaces the old `pm2 restart all` advice for workers.
- Deploy prerequisite for every environment: reachable Redis, the three new
  env values, the Horizon port published and its subdomain routed.
