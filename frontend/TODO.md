# TODO

Deferred work, grouped by area. Every open item says *why* it is deferred.
Done items stay, rewritten into a dense paragraph of what shipped (routes,
modules, deploy notes, spec link), so this file doubles as a changelog. Whenever
something is put off in a design or a review, add it here in the same change.

## Authentication & Authorization

- **Done (2026-09-16):** idle-session warning for both audiences. `lib/idle-session.ts` (`idleSchedule`) turns the backend's `session_inactivity_minutes` into warn/expire offsets; `components/idle-session-watcher.tsx` shows an alert dialog with a live countdown 60 s before the server ceiling, "Stay signed in" calls the audience's keep-alive action (`GET /profile`, which slides the token) and restarts the window, and a refused keep-alive signs out and hard-navigates to the login page. At zero the watcher asks the server first (another tab or a server action may have slid the token) and only signs out on a refusal, so it never revokes a live session. Callback props live in refs so parent re-renders never restart the countdown. `AdminIdleSession` (console layout) and `ClientIdleSession` (site layout) mount it from the memoized profile read.
- **Deferred:** the countdown ignores the backend's absolute token ceiling (`ADMIN_TOKEN_ABSOLUTE_MINUTES`), so in the last hour of a long session the warning can come later than the real cut-off; the zero-time server check still signs out cleanly. Expose the ceiling on the profile if that ever matters.
- **Deferred:** every natural expiry ends in the keep-alive receiving a 401, which `apiFetch` logs through `logError`. Routine noise once sessions expire in production; teach `apiFetch` (or the keep-alive) to treat a 401 on `/profile` as expected.
- **Deferred:** silently sliding the session on user activity. The watcher counts from the last request on purpose (UI activity never reaches the server), so a user typing into a long form for the whole window still gets the warning. A throttled background keep-alive on activity (say, at most once per five minutes) would remove that friction at the cost of extra requests; not needed until a form routinely takes longer than the inactivity window.

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
