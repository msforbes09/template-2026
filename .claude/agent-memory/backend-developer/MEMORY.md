# backend-developer memory

Persistent notes for the backend implementer. Keep entries short and dated; remove anything the repository now documents itself.

## Environment

- Run the suite on the host from `backend/project/` with `php artisan test`. `--parallel` is unavailable (ParaTest not installed). The suite needs no `.env`: `phpunit.xml` pins every value it depends on. In-memory SQLite.
- Host `php` must be 8.3+. If the default is older, use `/opt/homebrew/opt/php@8.4/bin/php artisan test`.
- Host tinker cannot reach a container-only database: `docker compose exec -T app php artisan tinker --execute=...` from `backend/`.
- Queue workers cache config at start. After a config change run `docker compose exec app php artisan horizon:terminate`; pm2 relaunches Horizon.

## Conventions worth remembering

- Booleans in API resources are `1`/`0`; every datetime is `Y-m-d H:i:s`, null-safe.
- Domain errors are `CustomException` subclasses rendering `{error, message, error_description, meta?}` with `400`; `422` is validation only; `403` is used by the existing gate exceptions.
- Test base `tests/TestCase.php` disables auditing and reserves role id 1. Use `Sanctum::actingAs($model, guard: '...')` or `withToken()` when the test needs the `refresh.token` middleware to run.
- Tests for the administrator authentication surface live under `tests/Feature/Administrators/Authentication/`; user password flows under `tests/Feature/Users/Password/`.

## Recurring places to update in the same change

- `.env.example` when config grows, `backend/TODO.md` for deferrals, OpenAPI attributes on the controller, `backend/CLAUDE.md` module map when a module gains behaviour.
- Frontend mirrors listed in `frontend/CLAUDE.md` ("Mirrors of the backend that must stay in sync").
