# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## What this directory is

One git repository holding a two-part project template:

| Directory | Role |
|---|---|
| `backend/` | Dockerized Laravel API workspace (the Laravel app itself lives in `backend/project/`) |
| `frontend/` | Next.js App Router application (public site, user dashboard, admin console) |

**Each half has its own `CLAUDE.md` with the authoritative commands, stack, rules, and conventions. Read the one for the half you are touching before doing anything else** — this root file intentionally does not duplicate them.

- Backend: `backend/CLAUDE.md` (+ `backend/.claude/working-rules.md`)
- Frontend: `frontend/CLAUDE.md` (+ `frontend/AGENTS.md`, `frontend/.claude/working-rules.md`, `frontend/.claude/skills/nextjs-conventions/`)

## How the two fit together

- The frontend calls the backend over HTTP. `API_URL` / `NEXT_PUBLIC_API_URL` in `frontend/.env` point at the backend's `api/v1` base; the port comes from the backend's `COMPOSE_WEBSERVER_PORT`. **Read the actual `.env` rather than assuming a port** — a wrong port makes a healthy backend look down.
- The backend exposes separate audiences under `api/v1/` (`administrator`, `user`, `common`); the frontend's `lib/api-client.ts` picks the base path per audience. Contract changes on the backend generally require a matching frontend change.
- Realtime uses Laravel Reverb (backend) and `NEXT_PUBLIC_REVERB_*` + `lib/echo-client.ts` (frontend).
- Design specs and plans live per half under `<half>/docs/superpowers/`. Run brainstorming and planning from the half you are changing so new specs land there.

## Hard rule — never commit to the base branch, never merge a PR

Applies to **both halves**, in **every** session, and overrides anything else in this file, in either half's own `CLAUDE.md`, or in a general instruction that could be read as permission:

- **Never commit directly to `develop`**, or to any other shared base branch. Every change goes on a feature branch, always.
- **Check the branch before the first commit of every session** — `git branch --show-current`. After a PR merges the checkout usually lands back on the base branch, and that is precisely when the mistake gets made.
- **Never merge a PR, and never merge a base branch yourself.** Open the PR and stop. A human reviews and merges.
- **Push explicitly the first time.** `git checkout -b <feature> origin/develop` sets the upstream to `origin/develop`, so a bare `git push` would target `develop`. Use `git push -u origin <feature-branch>`.
- A per-task instruction such as *"proceed until merged"* authorises the work **up to opening the PR** — not the merge. Treat a merge as authorised only when the user names that specific PR, in that moment.

## Base branch

- `main` holds the template as initially set up. Once a project is bootstrapped from it, **`develop` is branched from `main` and becomes the working base branch**; both halves' `CLAUDE.md` files describe the `develop` → `staging` → `production` flow from that point on.
- Until `develop` exists (initial setup only), feature branches are opened off `main` and merged into `main` on the user's explicit instruction.

## Which rules apply — pick a side, but never ignore the other

Decide from the task which half you are primarily acting in, then:

- **Acting as backend (touching `backend/`)** — follow `backend/CLAUDE.md` for all conventions, commands, and rules. But **always consider the frontend**: before changing or adding an endpoint, request/response shape, validation rule, status code, or auth behavior, check how `frontend/` consumes it (`lib/api-client.ts`, the relevant `modules/*`, `types/`) and either keep the contract compatible or make the matching frontend change in the same branch. There is no separate handoff document: one developer works both halves from this root, so the frontend change itself is the handoff.
- **Acting as frontend (touching `frontend/`)** — follow `frontend/CLAUDE.md` (+ `AGENTS.md`) for all conventions, commands, and rules. But **always check the backend's actual responses**: do not guess payloads — read the real source of truth in `backend/project/` (routes, controllers, Form Requests, API Resources, OpenAPI attributes) and shape types, fetchers, and error handling to match what the backend really returns.
  - **Minimal updates.** Make the smallest change that delivers the ask. If the task genuinely needs a backend change, say so and do it under the backend rules in the same branch rather than working around it on the frontend. No opportunistic refactors or "while I'm here" cleanups; propose them separately.

Cross-cutting tasks: apply each half's own rules to the files in that half, and treat the API contract as the shared boundary you verify on both sides. Do the backend change first (API + tests), then the frontend change against the real responses, on the same branch and in the same PR.

## Session continuity — read `.claude/sessions/` first

- **`RULES.md`** — the standing working agreements (branch/PR rhythm, verification baselines, TDD loop). Read it at the start of every session, alongside this file.
- **`YYYY-MM-DD.md`** — one file per working day: what shipped, pending work with resume-cold detail, environment gotchas. Read the **newest** one at session start; when the user wraps up a session, write/update today's file (minimal — important things only).

## Guardrails and agents — `.claude/`

- **`settings.json` + `hooks/`** — a deny list and two PreToolUse hooks enforce the hard rules at the tool layer: no edits to `.env` files or key material, no force-push, hard reset, destructive SQL, database-wiping artisan commands or Docker volume removal. A blocked command is one the user runs by hand.
- **`agents/`** — four project agents with persistent memory under `agent-memory/`: `backend-developer` and `frontend-developer` implement under each half's rules and the TDD loop; `skeptic-reviewer` (adversarial, read-only) and `qa-tester` (baselines + localhost browser checks, read-only) gate the result before a PR. Each agent reads the half's `CLAUDE.md` and working rules first; the agent files point at those rather than restating them.
