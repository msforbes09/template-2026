# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Critical: this is Next.js 16, not the Next.js you were trained on

APIs, conventions, and file structure may differ from training data. Before writing any code that touches routing, data fetching, caching, or rendering, read the relevant guide under `node_modules/next/dist/docs/01-app/` (or `02-pages/` for Pages Router, `03-architecture/` for compiler/deployment topics). Heed deprecation notices in those docs over prior Next.js knowledge.

## Project state

This repo is currently a bare `create-next-app` scaffold (App Router, TypeScript, Tailwind v4) with a few libraries pre-installed but not yet wired up. There is no custom architecture to describe yet — `app/page.tsx` and `app/layout.tsx` still contain the default template content.

## Commands

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, extends `eslint-config-next` core-web-vitals + typescript)

No test runner is configured in this repo yet.

## Stack

- **Next.js 16.2.9**, App Router, React 19, TypeScript (strict mode)
- **Tailwind CSS v4** — config lives in `app/globals.css` via `@theme inline`, not a `tailwind.config.*` file
- **shadcn/ui** (`components.json`): `base-nova` style, neutral base color, icons from `lucide-react`, CSS variables enabled. Aliases: `@/components`, `@/components/ui`, `@/lib`, `@/hooks`. Add components with the `shadcn` CLI rather than hand-rolling primitives — check `components/ui/` for ones already present (currently just `button.tsx`, built on `@base-ui/react`).
- **better-auth** — installed, not yet configured (no `auth.ts`/route handlers present yet)
- **swr**, **react-hook-form**, **zod** — installed, not yet used anywhere
- Path alias: `@/*` maps to the repo root (`tsconfig.json`)

## Skills

This project has Claude Code skills installed for the stack in use (Next.js conventions/upgrades/cache-components, shadcn, Better Auth + its plugins, react-hook-form, SWR, Zod). Prefer invoking the relevant skill over improvising when working in these areas — e.g. `nextjs-conventions` encodes this user's standard App Router patterns (data fetching, server actions, auth cookies, form/CRUD blueprints) and should be treated as the default approach for new pages/routes/forms in this repo.

# CLAUDE.md — Next.js Project

This project follows the **`nextjs-conventions` skill**, which is the single canonical source for all frontend conventions. When the skill is available, defer to it; this file only restates the non-negotiables and points to where the detail lives. If this file and the skill ever disagree, **the skill wins** — update this file rather than diverging.

## Stack (fixed)

Next.js 16 App Router · TypeScript · shadcn/ui on Base UI · Tailwind · Zod · React Hook Form · Better Auth (stateless, multi-audience) · SWR (combobox GET only) · lodash-es · date-fns. Backend is a Laravel/3rd-party JSON API that owns the database; the frontend forwards a Bearer token.

## Non-negotiables (the rules most often gotten wrong)

1. **`app/` is routes-only.** Segments + `page/layout/loading/error/default/route` only. All implementation lives in `modules/<feature>/`; shared code in `components/`, `hooks/`, `lib/`, `types/`. → `references/structure.md`
2. **PPR always.** No request-time data awaited at the page root — that means `apiFetch`, but also `searchParams`, non-static `params`, `cookies()`, `headers()`, `draftMode()`, `connection()`, and any helper (e.g. `requireSession`) that calls one of those internally. Dynamic data sits in `<Suspense>` with a skeleton that **matches the real component's dimensions**. Every segment has `loading.tsx` + `error.tsx`. → `references/data-fetching.md`
3. **GET on the server, mutations via server actions.** The only client-side GET is an async combobox via `useSWR` → internal route handler. Pair tagged GETs with `revalidateTag`. → `references/data-fetching.md`
4. **Guard every protected server read/mutation** with `requireSession(audience)` before any `apiFetch` (DAL pattern). Route handlers return 401, not redirect. `proxy.ts` is optimistic UX, not the boundary. Public/SEO reads are the only unguarded server reads. → `references/auth.md`
5. **One Better Auth instance per audience** (`client`, `admin`…), each with its own cookie name. → `references/auth.md`
6. **Forms = `AppFormField` + RHF + Zod.** Never raw shadcn `FormItem/...`; never import `@base-ui/*`/`@radix-ui/*`/`cmdk`/`vaul` directly. → `references/forms.md`
7. **URL is the source of truth** for search/filter/sort/pagination — never `useState` for these. `useState` is for ephemeral UI only (modal open, loading flags). → `references/seo.md`
8. **Errors:** map Laravel 422/401/other into `ActionResult`; **dev shows the real error, production shows a generic message and logs the real one to Slack** via the server-only `logError()`. → `references/error-handling.md`
9. **Env via `lib/env.ts`** (Zod-validated) — never `process.env.X` in app code. Server secrets are not `NEXT_PUBLIC_`. → `references/env.md`
10. **Parallel routes only for dashboards and intercepting `@modal` routes** — not for list pages. → `references/dashboards.md`
11. **Client/public pages are SEO-first** (full `generateMetadata`, JSON-LD, sitemap, robots); **admin pages are `noindex`.** → `references/seo.md`
12. **Create/edit are client-state modals** (`ResourceModal` + shared form), edit fetches fresh via a server action; CRUD blueprint triggers only on an explicit "CRUD" request. → `references/modals.md`, `references/crud-blueprint.md`
13. **Accessibility:** rely on shadcn/Base UI's built-in a11y (focus trap, `aria-modal`, escape, `aria-live`) — don't strip it; supply accessible names, loading/empty announcements, and correct heading/landmark structure. Keyboard-operable, named controls, state-as-text. → `references/accessibility.md`
14. **Per-audience layout shells** via route groups: `(site)/layout.tsx` (reusable `SiteHeader` + `SiteFooter`) and `(admin)/layout.tsx` (`AdminSidebar` logo+menu, `AdminHeader`, content pane for `{children}`). Shells are **Server Components**. → `references/structure.md`
15. **Client components only at the leaves.** Push `"use client"` as far down the tree as possible — never on a layout, page, section, or shell. Extract the interactive bit (hook/handler/browser API) into a small client leaf; the rest stays server-rendered and PPR-safe. → `references/structure.md`
16. **An exported server action is a public HTTP endpoint.** Its action ID ships in the client bundle; Origin/Host is the only built-in gate. Either guard it with `requireSession(audience)`, or treat it as public — validated, rate-limited, output-escaped. Verify a token with its issuer before minting a session; stamp and **assert the audience** (a cookie name is not an assertion); permission checks **fail closed**. → `references/security.md`, `references/auth.md`
17. **Escape before `<script>`, sanitize before HTML.** `serializeJsonLd` for JSON-LD; an allow-list `sanitizeContentHtml` for any backend/CMS HTML, applied once at the source. Never trust a client-settable header (`x-forwarded-for`[0], `cf-connecting-ip`) for audit IPs or rate-limit keys. → `references/security.md`
18. **Credential material never reaches a log sink or a user.** Redact at the sink, not the ~40 call sites; escape for the sink's markup. Mask upstream 5xx text on every outbound path — route handlers and public Server Components too, not just server actions. → `references/security.md`, `references/error-handling.md`

## When a URL path changes

Notification deep links are NOT derived from the router — they are hardcoded
strings in `modules/notifications/lib/notification-content.ts` (`TYPE_HREF`
per-type fallbacks, `referenceHref()` for `project`/`api_catalog` references,
and `OWNER_PROJECT_TYPES` which sends owner-facing project types to
`/dashboard/projects/{uuid}` instead of the public show). **Whenever a route is
added, renamed, or moved, check that file and its test
(`notification-content.test.ts`) in the same change** — a stale entry fails
silently as a clicked notification landing on a 404.

## Before starting UI work

Ask for 3 theme colors (primary, secondary, tertiary). Theme must be professional, modern, fully responsive.

## Testing

Vitest + RTL, Playwright for thin e2e, mock at the `fetch` boundary. Test the seams (schemas, format utils, `ActionResult` mapping, `buildApiError`, the DAL guard, route handlers, form behavior, and the security helpers — `serializeJsonLd`, `sanitizeContentHtml`, `safeErrorMessage`, `redact`, `clientIpFromHeaders`); don't re-test the framework or shadcn. → `references/testing.md`

## Where everything lives

The skill's `SKILL.md` is the index; each concern has a file under `references/`. Read the relevant reference before writing code in that area — the rules above are summaries, not the full spec.
