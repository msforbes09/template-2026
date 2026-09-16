# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

This is the frontend half of a two-part template. The root `../CLAUDE.md` holds the cross-cutting rules (reading the real backend responses, the hard branch rules, session notes) — read it first, then this file.

@AGENTS.md

## Critical: this is Next.js 16, not the Next.js you were trained on

APIs, conventions, and file structure may differ from training data. Before writing any code that touches routing, data fetching, caching, or rendering, read the relevant guide under `node_modules/next/dist/docs/01-app/` (or `03-architecture/` for compiler/deployment topics). Heed deprecation notices in those docs over prior Next.js knowledge.

## Repository layout

This is the frontend half of a two-part template; the Laravel API it talks to lives in the sibling `backend/` workspace and owns the database.

- **`app/`** — routes only: segments plus `page/layout/loading/error/route`. Two audiences via route groups: `(site)` (public pages and the user dashboard), `(auth)` (login, register, forgot password), and `admin/` (the console).
- **`modules/<feature>/`** — all implementation (components, actions, hooks, schemas, lib). Shared code in `components/`, `hooks/`, `lib/`, `types/`.
- **`docs/`** — design specs and plans under `docs/superpowers/`, deploy runbooks, QA plans. See `docs/README.md` for the taxonomy. Run brainstorming/planning from this directory so new specs land here.
- **`TODO.md`** — deferred work, grouped by area, with the reason each item is deferred.
- **`.claude/skills/nextjs-conventions/`** — the house architecture (the canonical source for every rule below). `.claude/working-rules.md` describes how a session runs.

## Stack

- **Next.js 16**, App Router, React 19, TypeScript (strict), PPR via `cacheComponents: true`
- **Tailwind CSS v4** — config in `app/globals.css` via `@theme inline`
- **shadcn/ui** on Base UI (`components.json`): add primitives with the `shadcn` CLI, never hand-roll them
- **Better Auth** stateless, one instance per audience (`client`, `admin`), each with its own cookie
- **React Hook Form + Zod** for every form, through `AppFormField`
- **SWR** only for the async combobox GET; **laravel-echo + pusher-js** for Reverb
- **lodash-es** (named imports), **date-fns**
- **Vitest 3** — node for `*.test.ts`, jsdom for `*.test.tsx` (React Testing Library)

Path alias `@/*` maps to the repo root.

## Commands

```bash
npm run dev          # http://localhost:3000, backend expected on :8000
npm run lint         # ESLint (flat config, eslint-config-next + no-console)
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run build        # production build; prebuild runs lint + tests
```

`npm run build` needs a throwaway 32+ character `BETTER_AUTH_SECRET` because the build runs as `NODE_ENV=production` (see `lib/env.ts`).

## Modules

- **client-auth** — registration (email OTP), login with email-OTP 2FA and trusted device, forgot/reset/change password, profile (`draft` → `completed` with edit cooldowns; `mobile_number` is a plain contact field), PSGC address combobox, delete account.
- **site** — the public shell (header, footer, account menu) and the user dashboard cards.
- **landing** — one placeholder hero; replace it per project.
- **content** — the CMS blocks behind `/faqs`, `/privacy-policy`, `/terms-of-service` and the admin Contents CRUD.
- **notifications** — the bell, the list, mark-read, and the realtime stream on `private-user.{uuid}`. The presentational map per type and the deep links live in `modules/notifications/lib/notification-content.ts`.
- **admin** — the console shell (sidebar, header, nav gated per permission), login, change password, the static welcome page (`modules/admin/lib/welcome-links.ts`).
- **administrators**, **access-control** (roles, permissions), **users** (list and show only), **gallery**, **broadcasts** (all users, by status, or one uuid), **admin-logs** (audit, auth attempts, connections), **feature-flags** (`maintenance_mode` only), **uploads**.

## Non-negotiables (the rules most often gotten wrong)

1. **`app/` is routes-only.** All implementation lives in `modules/<feature>/`. → `references/structure.md`
2. **PPR always.** No request-time data awaited at the page root — `apiFetch`, `searchParams`, non-static `params`, `cookies()`, `headers()`, or any helper (e.g. `requireSession`) that calls one internally. Dynamic data sits in `<Suspense>` with a skeleton that **matches the real component's dimensions**. Every segment has `loading.tsx` + `error.tsx`. → `references/data-fetching.md`
3. **GET on the server, mutations via server actions.** The only client-side GET is an async combobox via `useSWR` → internal route handler. Pair tagged GETs with `revalidateTag`. → `references/data-fetching.md`
4. **Guard every protected server read/mutation** with `requireSession(audience)` before any `apiFetch` (DAL pattern). Route handlers return 401, not redirect. Public/SEO reads are the only unguarded server reads. → `references/auth.md`
5. **One Better Auth instance per audience**, each with its own cookie name. → `references/auth.md`
6. **Forms = `AppFormField` + RHF + Zod.** Never raw shadcn `FormItem/...`; never import `@base-ui/*`/`@radix-ui/*`/`cmdk`/`vaul` directly. → `references/forms.md`
7. **URL is the source of truth** for search/filter/sort/pagination — never `useState` for these. → `references/seo.md`
8. **Errors:** map Laravel 422/401/other into `ActionResult`; **dev shows the real error, production shows a generic message and logs the real one to Slack** via the server-only `logError()`. → `references/error-handling.md`
9. **Env via `lib/env.ts`** (Zod-validated) — never `process.env.X` in app code. Server secrets are not `NEXT_PUBLIC_`. **The product name is `NEXT_PUBLIC_APP_NAME`**; never hard-code a brand. → `references/env.md`
10. **Parallel routes only for dashboards and intercepting `@modal` routes.** → `references/dashboards.md`
11. **Public pages are SEO-first** (`generateMetadata`, JSON-LD, sitemap, robots); **dashboard and admin pages are `noindex`.** → `references/seo.md`
12. **Create/edit are client-state modals** (`ResourceModal` + shared form); the CRUD blueprint triggers only on an explicit "CRUD" request. → `references/modals.md`, `references/crud-blueprint.md`
13. **Accessibility:** rely on shadcn/Base UI's built-in a11y; supply accessible names, loading/empty announcements, correct heading/landmark structure. → `references/accessibility.md`
14. **Per-audience layout shells** via route groups; shells are **Server Components**. → `references/structure.md`
15. **Client components only at the leaves.** Never `"use client"` on a layout, page, section, or shell. → `references/structure.md`
16. **An exported server action is a public HTTP endpoint.** Guard it with `requireSession(audience)`, or treat it as public — validated, rate-limited (`lib/rate-limit.ts`), output-escaped. Verify a token with its issuer before minting a session; **assert the audience**; permission checks **fail closed**. → `references/security.md`, `references/auth.md`
17. **Escape before `<script>`, sanitize before HTML.** `serializeJsonLd` for JSON-LD; `sanitizeContentHtml` for any backend/CMS HTML. Never trust a client-settable header for audit IPs or rate-limit keys. → `references/security.md`
18. **Credential material never reaches a log sink or a user.** Redact at the sink (`lib/redact.ts`); mask upstream 5xx text on every outbound path. → `references/security.md`, `references/error-handling.md`
19. **`no-console` is an error everywhere** except the sanctioned `lib/log-error.ts`. Never print a token, a session, or a cookie value, even behind a dev check.

## When a URL path changes

Notification deep links are NOT derived from the router — they are hardcoded strings in `modules/notifications/lib/notification-content.ts` (`TYPE_HREF` per-type fallbacks and `referenceHref()`). **Whenever a route is added, renamed, or moved, check that file and its test in the same change** — a stale entry fails silently as a clicked notification landing on a 404. The same goes for `modules/admin/lib/welcome-links.ts`, `modules/admin/lib/nav-sections.ts` and `app/sitemap.ts`.

## Mirrors of the backend that must stay in sync

These are hand-copied from the backend and pinned by tests; update them in the same change as the backend:

- `modules/admin/lib/admin-can.ts` — permission names.
- `modules/admin-logs/lib/audit-options.ts` — audited model names (the morph map) and events.
- `modules/admin-logs/lib/connection-types.ts` — connection-log `type` values.
- `types/feature-flag.ts` — flag names.
- `types/notification.ts` — notification types.

## Before starting UI work

Ask for 3 theme colors (primary, secondary, tertiary) if the project has not set them; they live in `app/globals.css`. The theme must be professional, modern, fully responsive.

## Testing

Vitest + React Testing Library, mock at the `fetch` boundary. Test the seams (schemas, format utils, `ActionResult` mapping, `buildApiError`, the DAL guard, route handlers, form behavior, and the security helpers — `serializeJsonLd`, `sanitizeContentHtml`, `safeErrorMessage`, `redact`, `clientIpFromHeaders`, `checkRateLimit`); don't re-test the framework or shadcn. → `references/testing.md`

## Engineering principles

- **KISS** — the most straightforward solution that works.
- **DRY** — reuse existing helpers and components before adding new ones.
- **YAGNI** — build only what the current requirement needs.

## Rules

- **Never edit `.env` files.** Update the tracked `.env.example` and tell the user what to set.
- **Always keep documentation in sync with changes.** Update this `CLAUDE.md`, `TODO.md`, and the specs/plans under `docs/superpowers/` in the same change.
- **Capture deferred work in `TODO.md`** in the same change it is put off.
- **Develop features with the Red → Green → Blue (TDD) cycle:**
  1. **🔴 Red** — Write one failing test describing the desired behavior. Run it and watch it fail for the *right* reason.
  2. **🟢 Green** — Write the minimum production code to make that test pass. Keep the rest of the suite green.
  3. **🔵 Blue (Refactor)** — Clean up with tests staying green. Add no new behavior in this phase.

  The Iron Law: no production code without a failing test first.

## Branching & Pull Requests

- **`develop` is the working branch.** All ongoing work targets `develop`. It is branched from `main` once the template's initial setup lands; until then feature branches go off `main` (see the root `CLAUDE.md`).
- **Every update goes through a pull request into `develop`** — do not commit straight to `develop`. The only exception is an explicit user instruction.
- **Release flow: `develop` → `staging` → `production`.** Promotions to `staging` are cherry-picks of the develop merge commits (`git cherry-pick -x -m 1 <merge>`) on a `release/staging-YYYY-MM-DD*` branch, PR'd into `staging`. Releases to `production` are a plain `staging → production` PR with the deploy steps in the body (see `docs/deploy/`).
- **Never merge a PR without the user's explicit go-ahead.** Open the PR and stop; the merge is the user's call, per PR, every time.
- If the repository runs an automated review bot, read its comments and resolve every real one before a PR is merged.

## Where everything lives

The skill's `SKILL.md` is the index; each concern has a file under `.claude/skills/nextjs-conventions/references/`. Read the relevant reference before writing code in that area — the rules above are summaries, not the full spec. If this file and the skill ever disagree, **the skill wins** — update this file rather than diverging.
