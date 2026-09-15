# Frontend Template — Design

**Date:** 2026-09-15
**Status:** Approved

## Problem

The backend in this workspace (`../backend`) is a project template pruned from
a previous product's Laravel API. Its handoff
(`../backend/docs/handoff/2026-09-15-frontend-template-fe-handoff.md`) lists,
module by module, what survived. The frontend half of the template does not
exist yet. It must be derived from the previous product's Next.js frontend
(reference tree: `/Volumes/Developer/Projects/DICT/egov-api/egov-api-ui`) the
same way: keep the hardened code and conventions, remove every module the
backend no longer serves, and leave no trace of the origin project.

## Decision summary

- **Copy, then prune.** The reference tree is copied wholesale (minus
  `node_modules`, `.next`, `.git`, `.env`, build caches, and the service-account
  key), then reduced in dependency order with lint, type-check, and the Vitest
  suite run after every step. Rebuilding from an empty scaffold was rejected:
  the value of the template is the inherited, already-hardened code.
- **Drop the AI assistant** (module, chat route handlers, Vertex client, rate
  limiter, service-account mount, `ai`/`@ai-sdk/*`/`google-auth-library`
  dependencies, the `server-only` test stub). Every tool it exposed read a
  surface the backend removed. **Accepted caveat:** the template ships no chat.
- **Minimal neutral public site.** Keep the `(site)` shell (header, footer),
  one placeholder hero landing page, the three content-driven legal pages
  (FAQs, privacy policy, terms of service), and the user dashboard area. All
  catalog, project, hackathon, activation, exchange-code, face-liveness, and
  developer-tab sections go.
- **Static admin welcome page** at `/admin`: greeting, signed-in admin name and
  role, quick links to permitted modules. No fetch. The removed summary endpoint
  and usage dashboard have no replacement in the backend template.
- **Documentations CRUD is not built.** The backend keeps it; the reference
  frontend never had it. Logged in `TODO.md` with the reason. **Accepted
  caveat:** the `documentations-view/manage` permissions have no screen.
- **Self-contained `frontend/`** mirroring `backend/`: own `CLAUDE.md`,
  `.claude/skills/nextjs-conventions`, `docs/superpowers/{specs,plans}`,
  `docs/handoff`, `docs/qa`, `TODO.md`, `README.md`, `.env.example`,
  `.github/workflows/ci.yml`, `Dockerfile`, `docker-compose.yml`, `nginx.conf`.
  **Accepted caveat:** GitHub Actions only reads `.github/` at the repository
  root; while both halves share one repository the workflow must be moved to
  the root with `working-directory: frontend`. The README says so.
- **Docker setup kept and neutralised**: no staging hostnames or Reverb key
  defaults in build args, generic image name, no secret mounts.
- **PSGC address lookups and Turnstile stay as-is.** Both are part of the
  backend contract; PSGC keeps its name because renaming would break the wire
  format.
- **Conventions are inherited unchanged.** The `nextjs-conventions` skill and
  the root `CLAUDE.md` non-negotiables are already brand-neutral and align with
  the backend's rules (kebab-case URLs, snake_case fields, 422 for validation
  only, shared error envelope, never edit `.env`, TDD, docs taxonomy).

## Module map

### Kept unchanged

`access-control`, `administrators`, `content`, `gallery`; hooks
`use-reset-on-hide`, `use-update-search-params`, `use-url-tab`; the shadcn
component set under `components/ui/` except the files listed under "Removed".

### Kept with edits

| Module | Edits |
|---|---|
| `admin` | Nav loses catalogs, events, projects, gateway-logs entries and the `api-catalogs-view` flag; delete `projects-status-nav.tsx`, `dashboard-counts.ts`, the stat-card dashboard; `log-nav-links.ts` keeps audit/auth/connection only; new static welcome page. |
| `admin-logs` | `connection-log-table.tsx` inlines the method badge and status badge it borrowed from `api-docs` and `gateway-logs`. |
| `users` | Actions keep `getUsers`/`getUser` only. Delete toggle-assessment, approve, return, make-approved-developer, bump-quota, suspend, unsuspend, demote and their buttons/modals/schemas/helpers. Status label is `draft`\|`completed`. Columns and view modal drop type, credits, assessment fields and the gateway imports. List filters: `search`, `status`, `is_active`; sort keys `id`, `created_at`, `updated_at`. |
| `client-auth` | Delete submit-application button, applications-closed notice, developer-only notice, account-type badge, account journey and profile review where assessment-only. Account helpers keep `draft`\|`completed`. Honour `details_editable_at` / `photo_editable_at`. |
| `broadcasts` | Audience: all users, by `status` (`draft`\|`completed`), or one `user_uuid`. Remove `type` everywhere (schema, form, audience preview, stored `filters`). |
| `notifications` | Presentation map keeps `welcome`, `welcome.back`, `profile.completed`, `security.password_changed`, `security.account_recovered`, `announcement`. Remove `review.*`, `project.*`, `application.*`, `sanction.*`, `credits.*`, `OWNER_PROJECT_TYPES`, and the project/api_catalog branches of `referenceHref` (returns null). |
| `feature-flags` | `FEATURE_FLAG_NAMES = ["maintenance_mode"]`; all other flags and their consumers removed. |
| `site` | Delete activation-code form, api-catalog credential components, exchange-code and face-liveness generators, developer access/tabs, catalog nav link and dashboard cards, public-catalog JSON-LD and fetchers, `actions/*`. Header, mobile menu, dashboard explore cards and footer lose their links and the assistant path check. |
| `landing` | Reduced to one neutral hero section. Delete showcases, catalog carousel, digital-platforms catalog, service cards. |
| `uploads` | Camera dialog loses QR mode; `qr-scanner` removed. |

### Removed

Modules `api-catalog`, `api-docs`, `assistant`, `egov-events`, `gateway-logs`,
`gateway-quota`, `gateway-usage`, `hackathon`, `projects`, `reviews`,
`user-activity`.

Routes: `(site)/api-catalogs/**`, `(site)/projects/**`, `(site)/assistant`,
`(site)/docs/**`, `(site)/egov-hackathon-2026-criteria`,
`(site)/dashboard/{developers,usage,api-catalogs,projects,review}/**`,
`admin/(dashboard)/{api-catalogs,projects,egov-events,gateway-logs}/**`,
`api/chat`, `api/assistant/**`. The `/projects/top-30` redirect in
`next.config.ts`. Sitemap entries for catalogs, projects, hackathon.

Shared code: `lib/catalog-meta.ts`, `lib/ai/`, `lib/highlight.ts`;
`types/{api-catalog,api-catalog-credentials,gateway-credential,gateway-log,gateway-usage,project,public-api-catalog,review,user-activity,user-api-catalog}.ts`,
`types/markdown-it-plugins.d.ts`; `components/ui/{chart,carousel,markdown,markdown-editor}.tsx`;
`detail-list.tsx` loses its `code-block` import; `lib/report-error.ts` loses
the assistant rate-limit import; `test/stubs/` and its vitest alias.

Dependencies: `ai`, `@ai-sdk/react`, `@ai-sdk/google-vertex`,
`google-auth-library`, `recharts`, `embla-carousel-react`, `mermaid`, `katex`,
`@vscode/markdown-it-katex`, `markdown-it` and all `markdown-it-*`,
`@types/markdown-it`, `highlight.js`, `qr-scanner`, `qrcode.react`,
`puppeteer-core`. `serverExternalPackages` in `next.config.ts` drops
`google-auth-library`.

## Origin removal

- **Never copied:** `egovai-sa.json` (Google service-account key), `.env`
  (live Slack webhook and Turnstile key), `markdown/` (eight project-specific
  docs), `api-schemas/egov-sso-collection.json`, every file under `public/`
  and `app/icon.png`.
- **Neutralised:** `lib/env.ts` defaults for Reverb host and app key become
  required-or-localhost with no real value; `NEXT_PUBLIC_EGOV_SSO_PARTNER_CODE`
  removed; `API_URL` defaults stay `http://localhost:8000/api`. The three auth
  clients and the OTP client read the base URL from env only. Dockerfile build
  args and compose defaults point at `http://localhost:8000` / `example.com`.
  Compose image name `template-frontend`. nginx zone renamed, `server_name
  example.com`. `app/layout.tsx` metadata and `components/layout/logo.tsx` use
  `NEXT_PUBLIC_APP_NAME` and a neutral inline SVG mark. Admin login placeholder
  becomes `admin@example.com`; fixture emails become `user@example.com`.
- **Product name** is one env value, `NEXT_PUBLIC_APP_NAME`, validated in
  `lib/env.ts`, used by metadata, logo alt text, header, footer, and legal-page
  titles. No hard-coded brand anywhere.
- **Acceptance check:** a case-insensitive grep of the final tree (excluding
  `node_modules`, `.next`, lockfile) for `egov`, `dict`, `gov.ph`, `oueg`,
  `hackathon`, `citizen`, `philippine`, `bagong`, `vertex`, `gemini` returns
  zero hits. `PSGC` is the only accepted acronym and is documented in the
  README as the address reference format the backend serves.

## New code (TDD)

Small, each with a failing test first:

1. `NEXT_PUBLIC_APP_NAME` in `lib/env.ts` (schema test).
2. Admin welcome page content component: renders name, role, and only the
   links the session's permissions allow (component test).
3. Neutral landing hero: renders the app name from env (component test).
4. Nav sections after pruning: no removed permission keys (existing test
   updated).
5. `notification-content` after pruning: kept types map, removed types fall
   back, `referenceHref` returns null for unknown references (existing test
   updated).
6. `broadcast-audience` without `type` (existing test updated).
7. `user-status-label` with two statuses (existing test updated).

Component tests need `@testing-library/react`, `@testing-library/user-event`,
`jsdom` and a `vitest` environment switch for `*.test.tsx`; the reference
suite is node-only unit tests today. This is the one testing-setup addition.

## Docs and repository hygiene

- `docs/README.md` taxonomy copied from the backend; `docs/superpowers/README.md`,
  `docs/handoff/README.md`, `docs/qa/README.md` with the same header
  templates, each with one generic exemplar.
- `TODO.md` in the backend's format, seeded with: Documentations CRUD (not
  built, backend endpoint exists), component-test coverage of forms (none in
  the reference), CI workflow relocation once the repository layout is fixed.
- `CLAUDE.md`: the reference's non-negotiables with the stale "Project state"
  paragraph replaced by an accurate description, a "Repository layout" section
  pointing at `docs/`, the backend's engineering principles, `.env` rule, TDD
  cycle, and branching rules restated for the frontend. The "ask for 3 theme
  colors" instruction stays.
- `.claude/skills/nextjs-conventions/` copied intact; SKILL.md frontmatter
  reworded to "the house architecture for production Next.js 16 App Router
  frontends against a Laravel API".
- `.claude/working-rules.md` copied from the backend with the environment
  notes replaced by the frontend's (`npm run lint`, `npx tsc --noEmit`,
  `npm test`).
- `README.md`: what the template contains, layout table, getting started,
  the deploy prerequisite that the backend's `REVERB_ALLOWED_ORIGINS` and
  `CORS_ALLOWED_ORIGINS` must list the frontend host, and the CI relocation
  note.
- `.env.example` lists every variable `lib/env.ts` validates with
  `example.com` hosts and no real values.
- `.github/workflows/ci.yml`: on push and pull request, `npm ci`, `npm audit
  --audit-level=high`, `npm run lint`, `npx tsc --noEmit`, `npm test`.
- `package.json` name `template-frontend`; `prebuild` keeps lint + test.

## Verification

Done means: `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run
build` all pass; the origin grep returns zero; `npm ls` reports no
extraneous or missing packages; every route under `app/` renders in `next
dev` against the backend template's base URL with no 404 from a pruned link.
