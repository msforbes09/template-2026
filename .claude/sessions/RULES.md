# Working agreements (standing — apply every session)

The hard rules live in the root `CLAUDE.md` (never commit to the base branch, never
merge, explicit first push, TDD Iron Law). These are the practices layered on top.

## Branch & PR rhythm
- One **daily branch**: `enhancement/YYYY-MM-DD` off freshly-fetched `origin/develop`,
  commits stacked all day, one commit per agreed todo item.
- **One PR per half at end of day**, opened only when the user says so. The backend
  PR merges first when the frontend consumes its contract. Claude opens, a human merges.
- After a human merges: delete the local + remote branch (and any worktree).
- First push: `git push -u origin <branch>`. Check `git branch --show-current`
  before the first commit of every session.
- Cross-cutting features: backend (API + tests + handoff) first, then frontend
  against the real responses.

## Session loop
- Discuss first, no code until "go". Decisions are settled one at a time, with a
  recommendation first.
- "Proceed until <stage>" carries the work through that stage without further
  check-ins; "proceed until merged" still stops at the open PR unless the user
  names that PR.
- Never edit `.env` files. Update `.env.example` and say what to set.

## Verification baselines
- Backend: from `backend/project/` → `php artisan test` then `vendor/bin/pint --dirty`.
  The suite needs no `.env`; `phpunit.xml` pins every value it depends on.
- Frontend: from `frontend/` → `npx tsc --noEmit`, `npm run lint`, `npm test`.
- TDD for every feature: Red (watch it fail for the right reason) → Green → Blue.
- Both baselines must be green before a commit is described as done.

## Dev server & browser
- Never trigger recompiles or reloads on the user's running `next dev` server
  (no forced reloads, no second dev server). Edits are fine — the user reloads.
- Browser automation is localhost-only. Never point Claude-driven tabs at staging
  or production.

## Session hygiene
- At session start: read the newest dated file in this folder.
- At session end (user says "clear"/"store"): write/update `YYYY-MM-DD.md` here —
  minimal: PR state, what shipped (one-liners), pending work with enough detail to
  resume cold, environment gotchas. Update `CLAUDE.md` only if a standing rule changed.
