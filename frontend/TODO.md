# TODO

Deferred work, grouped by area. Every open item says *why* it is deferred.
Done items stay, rewritten into a dense paragraph of what shipped (routes,
modules, deploy notes, spec link), so this file doubles as a changelog. Whenever
something is put off in a design or a review, add it here in the same change.

## Authentication & Authorization

## Users

## Administrators

- **Done (2026-09-16):** administrator password expiry on the console. `types/administrator.ts` gained the profile-only `password_changed_at`, `password_expires_at`, `is_password_expired`, `password_expiry_waives_remaining`; `modules/admin/lib/password-gate.ts` decides the forced-change reason (`temporary` | `expired`) and `ForcePasswordChangeModal` words each; `PasswordExpiryBanner` (dashboard page) renders `PasswordExpiryNotice` while postponements remain, whose "Remind me later" calls the `waivePasswordExpiry` action (`POST administrator/password/waive-expiry`) and refreshes.

## Notifications

## Content

- **Documentations CRUD screen.** The backend template serves
  `administrator/documentations` (and grants `documentations-view/manage`), but
  the reference frontend never had a screen for it, so the template ships
  without one. Build it by cloning `modules/content` (list, create/edit modals,
  delete dialog) when a project needs it; wire the nav entry through
  `modules/admin/lib/nav-sections.ts` and the welcome links.

## Testing

- **Component coverage is thin.** Only the admin welcome page and the landing
  hero have component tests; forms are covered by their Zod schemas only,
  because the reference suite was node-only and the jsdom setup arrived with
  this template. Add component tests with the first form change.

## Deployment / CI-CD

- **CI workflow location.** `.github/workflows/ci.yml` lives in `frontend/`,
  but GitHub only runs workflows from the repository root. While the frontend
  shares a repository with the backend, move the file to the root and add
  `defaults.run.working-directory: frontend`.

## Cleanup

## Future
