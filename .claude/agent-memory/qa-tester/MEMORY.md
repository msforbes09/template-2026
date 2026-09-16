# qa-tester memory

Setup facts and flaky spots for exercising the app. Verify each entry against the running environment before relying on it.

## Ports and processes

- Frontend `next dev` on `:3000` (user-run; never restart it). Backend nginx on `COMPOSE_WEBSERVER_PORT` from `backend/.env` (default `8000`), Horizon dashboard on `COMPOSE_HORIZON_PORT`.
- Reverb on `:8080` when realtime matters.

## Accounts

- The super-administrator account exists only when `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` were set before seeding. Ask the user for a throwaway admin login; never read it from `.env`.
- User accounts can be created through the public registration flow with the email OTP captured from the mail log or Mailpit when configured.

## Baselines as of 2026-09-16

- Backend: 602 tests green. Frontend: tsc clean, lint 0 errors (3 warnings), 223 tests green. Treat a drop below these as a finding.

## Flaky spots

- (none recorded yet)
