# Frontend workspace

A Next.js 16 project template with the conventions and hardening of a
production app already in place. Copy it, set `.env`, point it at the backend
template, and start on features.

## Layout

| Path | What it is |
|---|---|
| `app/` | Routes only (segments + `page/layout/loading/error/route`) |
| `modules/<feature>/` | All implementation, one folder per feature |
| `components/`, `hooks/`, `lib/`, `types/` | Shared code |
| `docs/` | Design specs, plans, handoffs, deploy runbooks, QA plans |
| `.claude/skills/nextjs-conventions/` | The house architecture; `CLAUDE.md` restates its non-negotiables |
| `TODO.md` | Deferred work, grouped by area |

## What is included

- Two audiences on Better Auth, each with its own cookie: **user** (register
  with email or SMS OTP, 2FA, trusted device, profile with edit cooldowns,
  contacts, delete account, notifications) and **administrator** (2FA,
  temporary-password gate, administrators, roles and permissions, user
  directory, content blocks, gallery, broadcasts, audit / auth-attempt /
  connection logs, maintenance mode)
- Server-side reads, server-action mutations, PPR, URL-driven search and
  pagination, `AppFormField` forms on React Hook Form + Zod
- Realtime notifications over Laravel Reverb
- PSGC address lookups (the backend's address reference data)
- Vitest (node for units, jsdom for components), ESLint, GitHub Actions CI,
  Docker + nginx reference config

## Getting started

```bash
cp .env.example .env && npm ci && npm run dev
```

Then open http://localhost:3000 with the backend template running on port 8000.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest |
| `npm run build` | Production build (runs lint and tests first) |

## Deploy prerequisites

- Set `NEXT_PUBLIC_APP_NAME`; it is the only place the product name lives.
- Every `NEXT_PUBLIC_*` value is inlined at build time, so it is a Docker build
  arg, not a runtime variable (see `Dockerfile` and `docker-compose.yml`).
- The backend's `CORS_ALLOWED_ORIGINS` and `REVERB_ALLOWED_ORIGINS` must list
  this app's origin.

## CI

`.github/workflows/ci.yml` runs lint, type-check and tests on every push and
pull request. GitHub only reads workflows at the repository root: if this
folder stays inside a larger repository, move the file there and add
`defaults.run.working-directory: frontend`.
