---
name: nextjs-conventions
description: Vincent's opinionated house architecture for production Next.js 16 App Router frontends against a Laravel API. A project-conventions spec, not a general library reference — it layers on top of (does not replace) generic Next.js/Better Auth/SWR/Zod/shadcn skills. Use when building, scaffolding, or reviewing a page, route, form, dashboard, data layer, or CRUD module in a repo that follows these conventions. Distinctive markers that mean THIS skill applies — app-routes-only plus modules/[feature] layout, apiFetch, requireSession DAL guard, multi-audience (client/admin) Better Auth cookie split, AppFormField, ResourceModal create/edit, ActionResult error shape, revalidateTag flow, the "CRUD" blueprint. Trigger on these house-specific terms — AppFormField, apiFetch, requireSession, modules/ layout, ResourceModal, multi-audience cookies, ActionResult — or when the user references their own project conventions or says "CRUD for X." For generic how-does-X-work questions, defer to the standalone library skills.
---

# Next.js Conventions (App Router, Next.js 16)

These are the standard conventions for building Next.js frontends against a Laravel (or 3rd-party) JSON API. The backend owns the database; the frontend is stateless and forwards a Bearer token. Apply these by default on every page and feature unless told otherwise.

Before doing UI work, **ask for 3 theme colors** (primary, secondary, tertiary) if a theme isn't already defined. The theme must be professional, modern, and fully responsive.

## Tech Stack (canonical)

Use exactly this stack unless told otherwise:

- **shadcn/ui on its Base UI primitives** — the design system. Prefer shadcn components as far as possible; only drop to a primitive when shadcn has no component for the need.
- **Tailwind CSS** — all styling. No CSS modules / styled-components / inline style objects except for dynamic values.
- **Zod** — schema validation (forms, env, API boundaries).
- **React Hook Form** — all forms (via `AppFormField`, §4).
- **Better Auth** — authentication, stateless multi-audience (§3).
- **SWR** — the one sanctioned client-side GET (combobox/autocomplete, §2b). Not for server data.
- **lodash-es** — utilities. Always import named from `lodash-es` (tree-shakeable): `import { debounce, groupBy } from "lodash-es"`. Never `import _ from "lodash"`. Reach for a native method first (`Array.map`, `Object.entries`, `structuredClone`); use lodash only when it's clearly simpler.
- **date-fns** — all date/time formatting and math. No moment.js, no raw `Date` arithmetic. See `lib/format.ts` (§4b).

Debounce uses `lodash-es` `debounce` everywhere (wrapped in `useMemo` inside components) — not `use-debounce`.

## Prerequisites

Packages assumed by the patterns here:

```bash
npm i better-auth react-hook-form @hookform/resolvers zod \
      @tanstack/react-table swr lodash-es date-fns
npm i -D @types/lodash-es
# testing (see references/testing.md)
npm i -D vitest @testing-library/react @testing-library/user-event vitest-tsconfig-paths msw @playwright/test
# shadcn/ui set up separately (npx shadcn@latest init — uses Base UI primitives), Tailwind configured
```

`tsconfig.json` path alias (every import in this skill uses `@/*`):

```jsonc
{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }
```

`next.config.ts` must enable PPR:

```ts
const nextConfig = { experimental: { cacheComponents: true } };
export default nextConfig;
```

Env vars go through a Zod-validated `lib/env.ts` (never `process.env.X` directly) — see `references/env.md`. Providers and app shell: see `references/structure.md`.

## How to use this skill

This file is an index. Each concern below is a one-paragraph rule summary plus a pointer to its reference file in `references/`. Read the summary to know the rule; open the reference when you need the code and full detail. Load only the references relevant to the task — several may apply at once.

This skill is the **canonical source** for these conventions. A companion `CLAUDE.md` (bundled at the skill root) restates the non-negotiables for a repo and defers to this skill; if the two ever disagree, the skill wins and `CLAUDE.md` should be updated to match.

Default behaviors regardless of task: ask for 3 theme colors before UI work; apply PPR; guard protected server-side reads/mutations; keep `app/` routes-only with implementation in `modules/`; URL is the source of truth for search/filter/pagination.

## Concerns (index)

### 0–1. Project structure, shells & app shell → `references/structure.md`
`app/` is **routing only** (segments + `page/layout/loading/error/default/route`); all implementation lives in `modules/<feature>/` (components, actions, hooks, schemas, types), with shared code in top-level `components/`, `hooks/`, `lib/`, `types/`. Providers (Toaster, SWRConfig) and default site metadata mount once in the root layout. **Per-audience layout shells** via route groups: `(site)/layout.tsx` (reusable `SiteHeader` + `SiteFooter`) and `(admin)/layout.tsx` (`AdminSidebar` logo+menu, `AdminHeader`, content pane for `{children}`) — shells are **Server Components**. **Client components only at the leaves:** push `"use client"` as far down as possible (never on layouts/pages/shells); extract the interactive bit into a small client leaf so the tree stays server-rendered and PPR-safe. Promote feature code to shared only when a second feature needs it.

### 2. Data fetching, caching & the combobox exception → `references/data-fetching.md`
PPR is mandatory (`cacheComponents: true`); never await request-time data at the page root — and "request-time data" includes every Next.js dynamic API (`searchParams`, non-static `params`, `cookies()`, `headers()`, `draftMode()`, `connection()`), plus any of your own helpers (like `requireSession`) that call one internally. Dynamic data goes in `<Suspense>`-wrapped async Server Components with dimension-matched skeletons. **GET reads run server-side via `apiFetch`; mutations go through server actions.** The only client-side GET allowed is an async combobox/autocomplete via `useSWR` hitting an internal route handler. Pair every tagged GET (`next: { tags }`) with `revalidateTag` in the mutating action.

### 3. Auth — Better Auth stateless, multi-audience → `references/auth.md`
Stateless Better Auth (no DB); the backend issues the JWT, Next stores it per audience. **One Better Auth instance per audience** (`client`, `admin`…) with its own cookie name, so sessions don't collide. Guard every protected server action and dynamic Server Component with `requireSession(audience)` (DAL pattern, session read wrapped in React `cache()`) before any `apiFetch`; route handlers return 401 instead of redirecting. `proxy.ts` is optimistic UX only, not the security boundary. Public/SEO reads are the only unguarded server reads.

### 4. Forms, formatting & utilities → `references/forms.md`
All form fields use the `AppFormField` wrapper (never raw shadcn `FormItem/FormLabel/...`); forms use React Hook Form + Zod. UI comes from shadcn (on Base UI) — never import `@base-ui/*`, `@radix-ui/*`, `cmdk`, `vaul` directly. Centralize display formatting in `lib/format.ts` (date-fns; PHP currency, VAT-inclusive); lodash-es named imports only, native-first.

### 5. API error handling & logging → `references/error-handling.md`
Map Laravel errors by status: 422 → field errors into RHF `setError` + root message; 401 → redirect to login; other → destructive alert. Mutations are server actions returning a typed `ActionResult`; the client maps it. **Dev shows the real error; production shows a generic message and ships the actual error to Slack** via one server-only `logError()` (Incoming Webhook), called from `apiFetch`, action catches (unexpected errors only — `apiFetch` already logs API errors), and `error.tsx` (via a `reportError` server action).

### 6. Dashboards & parallel/intercepting routes → `references/dashboards.md`
Parallel routes are reserved for exactly two cases: **dashboards** (named `@slot`s, each with own `page/loading/error/default`) and **intercepting modal routes** (`@modal` + `(.)`/`(..)` for URL-driven, refresh-safe modal overlays). Ordinary list pages do **not** use parallel routes — they're a plain `<Suspense>` section.

### 7. Shared UI primitives → `references/ui-primitives.md`
Compose the shared blocks in `components/ui/` — `AppFormField`, `FormRootError`, `FormSubmitButton`, `PageHeader`, `ConfirmDialog`, `EmptyState`, `StatusBadge`, `DataTable` — never reimplement them in features.

### 8. Create / edit modal pattern → `references/modals.md`
Create/edit use **client-state modals** (`useState`), not separate pages: a `ResourceModal` shell + a shared `[feature]-form.tsx`. Edit fetches fresh data on open via a **server action** (server-side GET) and shows a feature-specific skeleton that mirrors the form's layout. On success: close → `revalidateTag` → success toast.

### 9. Metadata, SEO & accessibility → `references/seo.md`
Every page has unique metadata; semantic HTML (one `h1`, `alt`, `aria-label`); URL is the source of truth for search/filter/pagination (never `useState`). **Client/public pages are SEO-first** — full `generateMetadata` (canonical, OG, Twitter), JSON-LD, `sitemap.ts`, `robots.ts`. **Admin pages are `noindex`.**

### 10. Admin module CRUD blueprint → `references/crud-blueprint.md`
**Triggered only when the user explicitly says "CRUD."** `app/.../page.tsx` = static shell (`PageHeader` + `CreateModal`) + `<Suspense>` list; implementation in `modules/<feature>/`. Create/edit = modals; delete = `ConfirmDialog`; list = `DataTable` + URL-driven toolbar/pagination. Other actions — ask first.

### 11. Environment variables → `references/env.md`
All env access goes through a single Zod-validated `lib/env.ts` that fails loudly at boot on a missing/malformed var — never read `process.env.X` directly in app code. Server secrets are not `NEXT_PUBLIC_`; server and client schemas are split. Keep `.env.example` in sync.

### 12. Testing strategy → `references/testing.md`
Vitest + React Testing Library, Playwright for thin e2e, mock the backend at the `fetch` boundary. Test the skill's seams thoroughly — Zod schemas, format utils, `ActionResult` mapping, `buildApiError`, the DAL guard, route handlers, and user-visible form behavior. Don't re-test the framework, shadcn primitives, or PPR mechanics.

### 13. Accessibility → `references/accessibility.md`
Rely on shadcn/Base UI's built-in a11y (focus trap, `aria-modal`, escape, `aria-live`) — don't strip it; supply the parts only you can (accessible names, loading/empty announcements, heading/landmark structure). Per-component rules for combobox, dialog, toast, confirm, and data table, plus a page baseline (one `h1`, landmarks, visible focus, reduced-motion, color-not-the-only-signal).

### 14. Security → `references/security.md`
**Read before writing any exported server action, anything that mints or reads a session, anything that injects a string into the DOM, and anything that reads a request header or writes to a log.** An exported server action is a **public HTTP endpoint** — its action ID ships in the client bundle, so it is either guarded with `requireSession` or deliberately public and therefore validated, rate-limited and output-escaped. Verify a token with its issuer before minting a session, and stamp + assert the **audience** (a cookie name is not an assertion). Permission checks **fail closed**. Never trust a client-settable header (`x-forwarded-for`'s left-most entry, `cf-connecting-ip`) for audit IPs or rate-limit keys. **Escape** before a `<script>` (`serializeJsonLd`) and **sanitize** with an allow-list before injecting HTML (`sanitizeContentHtml`). Credential material never reaches a log sink — redact at the sink, not the call sites. And wire the rules into `prebuild` so they fail a build rather than a review.

### Reference: API contract → `references/api-contract.md`
Laravel success/error response shapes, the `ApiError` type, and `isApiError`/`buildApiError` helpers used across the data and error-handling layers.
