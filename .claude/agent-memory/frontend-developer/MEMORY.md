# frontend-developer memory

Persistent notes for the frontend implementer. Keep entries short and dated; remove anything the repository now documents itself.

## Environment

- Baseline from `frontend/`: `npx tsc --noEmit`, `npm run lint`, `npm test`. The suite needs no `.env`.
- `npm run build` runs lint and tests first (`prebuild`) and needs a throwaway `BETTER_AUTH_SECRET` of 32+ characters because the build runs as `NODE_ENV=production`.
- Component tests (`*.test.tsx`) run in jsdom; everything else in node.
- Lint baseline as of 2026-09-16: 0 errors, 3 React Compiler warnings about `watch()`; do not "fix" those in passing.
- A running `next dev` can keep serving a stale stylesheet after a `globals.css` edit. Tell the user to restart it; never restart it yourself.
- Backend port comes from `backend/.env` `COMPOSE_WEBSERVER_PORT` and is mirrored in `frontend/.env` `API_URL`. Read them, never assume.

## Conventions worth remembering

- The admin console reads the administrator profile through server components; the forced password-change gate lives in `modules/admin/components/force-password-change-gate.tsx` and keys off the profile payload.
- Notification deep links, welcome links, nav sections and the sitemap are hardcoded and pinned by tests; check them on any route change.
- Mirrors of backend enums live in `modules/admin/lib/admin-can.ts`, `modules/admin-logs/lib/*`, `types/feature-flag.ts`, `types/notification.ts`.
