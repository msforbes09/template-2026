# Frontend Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce `frontend/`, a brand-neutral Next.js 16 project template pruned from the reference app so it matches the backend template's surface exactly.

**Architecture:** Copy the reference tree, then delete modules, routes, assets and dependencies in dependency order, keeping lint, type-check and the Vitest suite green after every task. New code is limited to a neutral landing hero, a static admin welcome page, an `NEXT_PUBLIC_APP_NAME` env value, and the docs/CI scaffolding that mirrors `backend/`.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript strict, Tailwind v4, shadcn on Base UI, Better Auth, React Hook Form + Zod, SWR, Laravel Echo/Reverb, Vitest 3.

**Spec:** `docs/superpowers/specs/2026-09-15-frontend-template-design.md`

## Global Constraints

- Reference tree (read-only source): `/Volumes/Developer/Projects/DICT/egov-api/egov-api-ui`. Never modify it.
- Target: `/Volumes/Developer/Projects/Personal/template-2026-09/frontend`. All commands below run there unless stated.
- Never copy or create `.env`. Only `.env.example`.
- Never copy `egovai-sa.json`, `public/`, `markdown/`, `api-schemas/egov-sso-collection.json`, `.next/`, `node_modules/`, `.git/`, `tsconfig.tsbuildinfo`, `next-env.d.ts`.
- Verification gate after every task: `npm run lint && npx tsc --noEmit && npm test`. All three must pass before the commit step.
- Commit messages: plain, no attribution trailer (per global CLAUDE.md). Commit from the workspace root `/Volumes/Developer/Projects/Personal/template-2026-09` with paths prefixed `frontend/`.
- Origin tokens that must reach zero hits by the end: `egov`, `dict`, `gov.ph`, `oueg`, `hackathon`, `citizen`, `philippine`, `bagong`, `vertex`, `gemini` (case-insensitive, excluding `node_modules`, `.next`, `package-lock.json`). `PSGC` is the only accepted acronym.
- Product name comes only from `env.NEXT_PUBLIC_APP_NAME`.
- Kept user statuses: `draft`, `completed`. Kept feature flag: `maintenance_mode`. Kept notification types: `welcome`, `welcome.back`, `profile.completed`, `security.password_changed`, `security.account_recovered`, `announcement`.
- New code follows Red → Green → Blue.

---

### Task 1: Copy the reference tree and prove the baseline is green

**Files:**
- Create: everything under `frontend/` except the exclusions above.

**Interfaces:**
- Produces: a working checkout whose `npm run lint`, `npx tsc --noEmit`, `npm test` pass before any pruning.

- [ ] **Step 1: Copy with exclusions**

```bash
cd /Volumes/Developer/Projects/Personal/template-2026-09
rsync -a \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude .env --exclude '*-sa.json' --exclude public \
  --exclude markdown --exclude tsconfig.tsbuildinfo --exclude next-env.d.ts \
  --exclude .DS_Store --exclude 'api-schemas/egov-sso-collection.json' \
  /Volumes/Developer/Projects/DICT/egov-api/egov-api-ui/ frontend/
mkdir -p frontend/public
```

- [ ] **Step 2: Install and run the gate**

```bash
cd frontend && npm ci && npm run lint && npx tsc --noEmit && npm test
```
Expected: lint clean, tsc clean, 77 test files pass. If `tsc` complains about missing `public/` assets it does not; images are runtime paths. If `next-env.d.ts` is missing, run `npx next typegen` once (or `npm run build` later regenerates it).

- [ ] **Step 3: Commit the raw copy**

```bash
cd /Volumes/Developer/Projects/Personal/template-2026-09
git add frontend && git commit -m "Copy reference frontend as template baseline"
```

---

### Task 2: Remove the AI assistant

**Files:**
- Delete: `modules/assistant/`, `app/api/chat/`, `app/api/assistant/`, `app/(site)/assistant/`, `lib/ai/`, `test/`
- Modify: `app/(site)/layout.tsx` (remove `AssistantMount` import and the Suspense block around it), `modules/site/components/conditional-site-footer.tsx` (remove the assistant path check), `lib/report-error.ts` (remove the `@/modules/assistant/lib/rate-limit` import and the code that used it), `lib/env.ts` (remove `ASSISTANT_ENABLED`, `GOOGLE_VERTEX_*` from schema and parse call), `vitest.config.ts` (remove the `server-only` alias and its comment), `next.config.ts` (remove `serverExternalPackages`), `nginx.conf` (remove the `egov_chat` limit zone and its `location` block), `docker-compose.yml` (remove the Vertex secret mount and `GOOGLE_VERTEX_*`/`ASSISTANT_ENABLED` env lines), `Dockerfile` (same env lines)
- Modify: `package.json` remove `ai`, `@ai-sdk/react`, `@ai-sdk/google-vertex`, `google-auth-library`

- [ ] **Step 1: Delete the directories**

```bash
rm -rf modules/assistant app/api/chat app/api/assistant "app/(site)/assistant" lib/ai test
```

- [ ] **Step 2: Run tsc and fix every reported import in the Modify list above.** For `lib/report-error.ts`, read it first: if the rate limiter wrapped the Slack report, replace the call with a direct call to the existing `logError` and delete the limiter reference. For `lib/env.ts` delete the whole assistant comment block and the four `GOOGLE_VERTEX_*` and `ASSISTANT_ENABLED` entries in both the schema and the `serverEnvSchema.parse({...})` call.

- [ ] **Step 3: Uninstall dependencies**

```bash
npm uninstall ai @ai-sdk/react @ai-sdk/google-vertex google-auth-library
```

- [ ] **Step 4: Gate**

```bash
npm run lint && npx tsc --noEmit && npm test
```
Expected: pass; `lib/env.test.ts` may reference `ASSISTANT_ENABLED` — delete those cases.

- [ ] **Step 5: Commit**

```bash
git add -A frontend && git commit -m "Remove the AI assistant and its dependencies"
```

---

### Task 3: Remove projects, reviews, events, hackathon

**Files:**
- Delete: `modules/projects/`, `modules/reviews/`, `modules/egov-events/`, `modules/hackathon/`, `app/(site)/projects/`, `app/(site)/egov-hackathon-2026-criteria/`, `app/(site)/dashboard/projects/`, `app/(site)/dashboard/review/`, `app/admin/(dashboard)/projects/`, `app/admin/(dashboard)/egov-events/`, `types/project.ts`, `types/project.test.ts`, `types/review.ts`
- Modify: `next.config.ts` (delete the `redirects()` function), `app/sitemap.ts`, `modules/admin/components/admin-nav.tsx`, `modules/admin/components/projects-status-nav.tsx` (delete), `modules/admin/lib/admin-can.ts` (`PERMISSIONS` drop `projectsView`, `projectsManage`, `egovEventsView`, `egovEventsManage`), `modules/landing/components/project-showcase.tsx` and `hackathon-showcase.tsx` (delete), `app/(site)/page.tsx` (drop those imports), `modules/notifications/lib/notification-content.ts`, `modules/site/components/dashboard-explore-cards.tsx`, `modules/client-auth/lib/account.ts` (`canCreateProjects` and every project helper), `modules/landing/components/hero.tsx` (temporarily point the catalog button at `/dashboard`; the hero is rewritten in Task 11)

- [ ] **Step 1: Delete the directories and files listed**

- [ ] **Step 2: Run tsc; work through each error.** The rule for every broken import: if the importing file exists only to serve a removed module, delete it; otherwise remove the import and the JSX or branch that used it. Do not stub.

- [ ] **Step 3: Update `notification-content.ts` and its test.** Remove every key beginning `review.`, `project.`, `application.`, `sanction.`, `credits.` from the presentation map and `TYPE_HREF`; delete `OWNER_PROJECT_TYPES` and `isOwnerFacing`; `referenceHref()` keeps its signature and returns `null` for any reference kind it no longer knows. In the test, delete the cases for removed types and add:

```ts
it("returns null for a reference kind it does not know", () => {
  expect(referenceHref({ type: "project", uuid: "abc" } as never)).toBeNull();
});
```
(Adjust the argument shape to the existing `referenceHref` parameter type.)

- [ ] **Step 4: Gate, then commit**

```bash
npm run lint && npx tsc --noEmit && npm test
git add -A frontend && git commit -m "Remove projects, reviews, events and hackathon modules"
```

---

### Task 4: Remove API catalogs and API docs

**Files:**
- Delete: `modules/api-catalog/`, `modules/api-docs/`, `app/(site)/api-catalogs/`, `app/(site)/docs/`, `app/(site)/dashboard/api-catalogs/`, `app/admin/(dashboard)/api-catalogs/`, `types/api-catalog.ts`, `types/api-catalog-credentials.ts`, `types/public-api-catalog.ts`, `types/user-api-catalog.ts`, `lib/catalog-meta.ts`, `lib/catalog-meta.test.ts`, `lib/highlight.ts`, `lib/highlight.test.ts`, `components/ui/markdown.tsx`, `components/ui/markdown-editor.tsx`, `components/ui/carousel.tsx`, `types/markdown-it-plugins.d.ts`, `api-schemas/` (whole directory; the blank collection template has no consumer once api-docs is gone)
- Modify: `components/ui/detail-list.tsx` (replace the `CodeBlock` import with a `<pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">` rendering the same value), `modules/admin-logs/components/connection-log-table.tsx` (inline a `MethodBadge` from api-docs: copy the component body into `modules/admin-logs/components/method-badge.tsx` before deleting api-docs), `modules/admin/lib/nav-sections.ts` (drop `catalogs`), `modules/admin/lib/nav-sections.test.ts`, `modules/admin/lib/admin-can.ts` (drop `apiCatalogsView/Manage`), `modules/admin/components/admin-nav.tsx`, `modules/landing/components/{catalog-carousel,service-cards,digital-platforms,logo-marquee}.tsx` (delete), `modules/site/components/{catalog-nav-link,dashboard-api-catalog,browse-public-catalogs-button,public-api-catalog-json-ld,public-api-catalog-list-json-ld,developer-access,developer-access-notice,developer-tabs,api-catalog-credential*}.tsx` (delete), `modules/site/lib/get-public-api-catalog.ts` (delete), `app/sitemap.ts`, `lib/env.ts` (drop `NEXT_PUBLIC_EGOV_SSO_PARTNER_CODE`), `hooks/use-url-tab.ts` (keep; generic)
- Modify: `package.json` remove `recharts` (after Task 5), `embla-carousel-react`, `mermaid`, `katex`, `@vscode/markdown-it-katex`, `markdown-it`, `markdown-it-abbr`, `markdown-it-deflist`, `markdown-it-emoji`, `markdown-it-footnote`, `markdown-it-mark`, `markdown-it-sub`, `markdown-it-sup`, `markdown-it-task-lists`, `@types/markdown-it`, `highlight.js`, `puppeteer-core`, `qrcode.react`

- [ ] **Step 1: Copy `MethodBadge` into `modules/admin-logs/components/method-badge.tsx`** (read `modules/api-docs/components/method-badge.tsx`, copy verbatim, fix its imports).

- [ ] **Step 2: Delete the directories and files listed; run tsc; fix per the Task 3 rule.**

- [ ] **Step 3: `nav-sections.ts`** — remove the `catalogs` field from `NavSectionPermissions`, `NO_NAV_SECTIONS`, and `navSectionPermissions`. Update the test's expected objects and the permission arrays to drop `api-catalogs-view`/`catalogs`.

- [ ] **Step 4: Uninstall dependencies**

```bash
npm uninstall embla-carousel-react mermaid katex @vscode/markdown-it-katex markdown-it markdown-it-abbr markdown-it-deflist markdown-it-emoji markdown-it-footnote markdown-it-mark markdown-it-sub markdown-it-sup markdown-it-task-lists @types/markdown-it highlight.js puppeteer-core qrcode.react
```

- [ ] **Step 5: Gate, then commit**

```bash
npm run lint && npx tsc --noEmit && npm test
git add -A frontend && git commit -m "Remove API catalogs, API docs and the markdown toolchain"
```

---

### Task 5: Remove gateway logs, quota, usage, live activity

**Files:**
- Delete: `modules/gateway-logs/`, `modules/gateway-quota/`, `modules/gateway-usage/`, `modules/user-activity/`, `app/(site)/dashboard/developers/`, `app/(site)/dashboard/usage/`, `app/admin/(dashboard)/gateway-logs/`, `types/gateway-log.ts`, `types/gateway-usage.ts`, `types/gateway-credential.ts`, `types/user-activity.ts`, `components/ui/chart.tsx`
- Modify: `modules/admin-logs/components/connection-log-table.tsx` (inline `GatewayStatusBadge` as `modules/admin-logs/components/http-status-badge.tsx`, copied before deletion), `modules/admin/lib/log-nav-links.ts` (drop `gateway`), `modules/admin/lib/admin-can.ts` (`getLogNavPermissions` drops gateway; `PERMISSIONS` drops `gatewayLogsView`, `usersGatewayQuota`, `dashboardView`), `modules/admin/components/admin-nav.tsx`, `modules/users/components/view-user-modal.tsx` (drop platform badge and credits), `modules/users/components/top-up-quota-modal.tsx` (delete), `modules/users/schemas/gateway-quota-schema*.ts` (delete), `modules/site/components/*` that reference quota/usage (delete the widget, fix the dashboard page), `app/(site)/dashboard/page.tsx`, `app/admin/(dashboard)/page.tsx` (drop `AdminUsageDashboard`; the page is rewritten in Task 10)
- Modify: `package.json` remove `recharts`

- [ ] **Step 1: Copy the status badge, delete, tsc, fix, uninstall `recharts`.**

- [ ] **Step 2: Gate, then commit**

```bash
npm run lint && npx tsc --noEmit && npm test
git add -A frontend && git commit -m "Remove gateway logs, quota, usage and live activity"
```

---

### Task 6: Prune the users module to list and show

**Files:**
- Modify: `modules/users/actions/user-actions.ts` (keep `getUsers`, `getUser`; delete `toggleAssessment`, `approveUser`, `returnUser`, `makeApprovedDeveloper`, `bumpGatewayQuota`, `suspendUser`, `unsuspendUser`, `demoteUser` or whatever the exact names are)
- Delete: `modules/users/components/toggle-assessment-button.tsx`, `remarks-history.tsx`, every approve/return/suspend/demote button or dialog, `modules/users/lib/{assessor-name,assessment-claim,claim-conflict,developer-grant}*.ts` and their tests
- Modify: `modules/users/lib/user-status-label.ts`, `user-status-label.test.ts`, `modules/users/components/user-columns.tsx`, `view-user-modal.tsx`, `users-toolbar.tsx` (status filter options `draft`/`completed`; drop `type`), `types/admin-user.ts` (drop `type`, `suspended_at`, `is_assessment_started`, `assessment_started_by*`, `assessment_started_at`, `assessment_remarks`, `approved_*`, `credentials_*`, `credits`; keep `status: "draft" | "completed" | null`), `types/client-user.ts` (same fields), `modules/client-auth/lib/account.ts` and `account-status.ts` (`AccountStatus = "draft" | "completed"`; delete assessment/approved/suspended helpers and their tests' cases), delete `modules/client-auth/components/{submit-application-button,applications-closed-notice,developer-only-notice,account-type-badge,account-journey}.tsx` and `profile-review.tsx` if it only renders assessment state

- [ ] **Step 1: Red — update `user-status-label.test.ts`** to expect exactly two known labels and humanized fallback:

```ts
it("labels the two lifecycle statuses", () => {
  expect(userStatusLabel("draft")).toBe("Draft");
  expect(userStatusLabel("completed")).toBe("Completed");
});
it("humanizes anything else", () => {
  expect(userStatusLabel("for_assessment")).toBe("For assessment");
});
```
Run: `npx vitest run modules/users/lib/user-status-label.test.ts` — expected FAIL on the second case (currently returns "For Assessment").

- [ ] **Step 2: Green — `USER_STATUS_LABELS` keeps only `draft` and `completed`.** Run the test: PASS.

- [ ] **Step 3: Delete and prune everything else listed; tsc; fix.** In `user-columns.tsx` keep uuid/display name, email, status badge, `is_active`, created/updated. Filters `search`, `status`, `is_active`. Sort keys `id`, `created_at`, `updated_at`.

- [ ] **Step 4: Gate, then commit**

```bash
npm run lint && npx tsc --noEmit && npm test
git add -A frontend && git commit -m "Reduce users to list and show with two statuses"
```

---

### Task 7: Broadcasts lose the type filter; feature flags keep maintenance only

**Files:**
- Modify: `modules/broadcasts/lib/broadcast-audience.ts`, `broadcast-audience.test.ts`, `modules/broadcasts/schemas/broadcast-schema.ts`, `modules/broadcasts/components/broadcast-form.tsx` (remove the type select), `types/broadcast.ts` (`BroadcastFilters` drops `type`; `status?: "draft" | "completed"`)
- Modify: `types/feature-flag.ts` (`FEATURE_FLAG_NAMES = ["maintenance_mode"] as const`), `modules/feature-flags/lib/*` defaults and any test listing the removed flags, every consumer of `developer_applications`, `project_reviews`, `api_catalog_reviews` (grep and delete the branches)

- [ ] **Step 1: Red — rewrite `broadcast-audience.test.ts`** cases to the new vocabulary:

```ts
it("describes everyone when no filter is set", () => {
  expect(describeAudience(null).label).toBe("All registered users");
});
it("describes a status audience", () => {
  expect(describeAudience({ status: "completed" }).label).toBe("All users with a completed profile");
  expect(describeAudience({ status: "draft" }).label).toBe("All users with an incomplete profile");
});
it("describes a single user", () => {
  const a = describeAudience({ user_uuid: "u-1" });
  expect(a.label).toBe("One user");
  expect(a.detail).toBe("u-1");
  expect(a.isSingleUser).toBe(true);
});
```
Run: expected FAIL on "One user" (currently "One citizen") and on any type case still present.

- [ ] **Step 2: Green — `broadcast-audience.ts`**: delete `TYPE_WORDS`, the `type` read, the `AccountStatus` import (inline `type AccountStatus = "draft" | "completed"` from `types/broadcast.ts`), `includesSuspendedOnly` (remove the field and every consumer), label `"One user"`, `STATUS_WORDS` keeps `draft` and `completed`. Run: PASS.

- [ ] **Step 3: Feature flags** — set the names array, then tsc drives the rest. Delete `modules/feature-flags/components/*` that gate removed features.

- [ ] **Step 4: Gate, then commit**

```bash
npm run lint && npx tsc --noEmit && npm test
git add -A frontend && git commit -m "Broadcast audiences by status only; maintenance is the sole feature flag"
```

---

### Task 8: Prune the site shell, uploads and activation remnants

**Files:**
- Delete: `modules/site/components/{activation-code-form,exchange-code-generator,exchange-code-*,face-liveness-session-generator}.tsx`, `modules/site/lib/extract-activation-token.ts`, `modules/site/actions/` (whole directory if only activation/exchange actions remain)
- Modify: `modules/site/components/site-header.tsx`, `mobile-menu.tsx`, `user-menu.tsx`, `site-footer.tsx`, `dashboard-explore-cards.tsx` (links only to `/dashboard/profile`, `/dashboard/notifications`, `/faqs`, `/privacy-policy`, `/terms-of-service`), `modules/uploads/components/camera-capture-dialog.tsx` (remove QR mode and the `qr-scanner` import), `package.json` remove `qr-scanner`

- [ ] **Step 1: Delete, prune, `npm uninstall qr-scanner`, tsc, fix.**

- [ ] **Step 2: Grep the remaining tree for `/api-catalogs`, `/projects`, `/developers`, `/usage`, `/assistant`, `/docs` hrefs** and remove each link:

```bash
grep -rn --include='*.ts' --include='*.tsx' -E '"/(api-catalogs|projects|dashboard/developers|dashboard/usage|assistant|docs)' app modules components lib
```
Expected after fixing: no output.

- [ ] **Step 3: Gate, then commit**

```bash
npm run lint && npx tsc --noEmit && npm test
git add -A frontend && git commit -m "Prune site shell links, activation flows and QR capture"
```

---

### Task 9: Add `NEXT_PUBLIC_APP_NAME` and neutralise env defaults

**Files:**
- Modify: `lib/env.ts`, `lib/env.test.ts`
- Modify: `lib/otp-client.ts:8`, `modules/admin/lib/admin-auth-client.ts:4`, `modules/client-auth/lib/client-auth-client.ts:4` (each reads `env.NEXT_PUBLIC_API_URL`; delete any literal fallback host)

- [ ] **Step 1: Red — add to `lib/env.test.ts`** (follow the file's existing pattern for re-importing the module with `vi.resetModules()`):

```ts
it("exposes the product name with a neutral default", async () => {
  delete process.env.NEXT_PUBLIC_APP_NAME;
  const { env } = await import("@/lib/env");
  expect(env.NEXT_PUBLIC_APP_NAME).toBe("App");
});
it("reads the product name from the environment", async () => {
  process.env.NEXT_PUBLIC_APP_NAME = "Acme Portal";
  const { env } = await import("@/lib/env");
  expect(env.NEXT_PUBLIC_APP_NAME).toBe("Acme Portal");
});
```
Run: `npx vitest run lib/env.test.ts` — expected FAIL: property undefined.

- [ ] **Step 2: Green — in `clientEnvSchema` add**

```ts
// The product name. The only place a brand is spelled: metadata, logo alt
// text, header, footer and legal-page titles all read it from here.
NEXT_PUBLIC_APP_NAME: z.string().min(1).default("App"),
```
and pass `NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME` in the parse call. Run: PASS.

- [ ] **Step 3: Neutralise Reverb defaults** in the same file:

```ts
NEXT_PUBLIC_REVERB_APP_KEY: z.string().min(1).default("local"),
NEXT_PUBLIC_REVERB_HOST: z.string().min(1).default("localhost"),
NEXT_PUBLIC_REVERB_PORT: z.coerce.number().int().positive().default(8080),
NEXT_PUBLIC_REVERB_FORCE_TLS: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
```
Rewrite the comment above them: "Laravel Reverb connection for notifications and broadcasts. Defaults match a local `php artisan reverb:start`."

- [ ] **Step 4: Grep for `oueg` and fix the three clients** — expected zero hits after:

```bash
grep -rn oueg --include='*.ts' --include='*.tsx' --include='*.yml' --include='Dockerfile' --include='*.conf' .
```

- [ ] **Step 5: Gate, then commit**

```bash
npm run lint && npx tsc --noEmit && npm test
git add -A frontend && git commit -m "Add NEXT_PUBLIC_APP_NAME and neutral env defaults"
```

---

### Task 10: Component test setup and the static admin welcome page

**Files:**
- Modify: `vitest.config.ts`, `package.json` (devDependencies `@vitejs/plugin-react-swc`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`)
- Create: `modules/admin/components/admin-welcome.tsx`, `modules/admin/components/admin-welcome.test.tsx`, `modules/admin/lib/welcome-links.ts`, `modules/admin/lib/welcome-links.test.ts`
- Modify: `app/admin/(dashboard)/page.tsx`
- Delete: `modules/admin/components/dashboard-content.tsx`, `dashboard-stat.tsx`, `modules/admin/lib/dashboard-counts.ts` and tests

**Interfaces:**
- Produces: `welcomeLinks(permissions: readonly string[]): { href: string; label: string; description: string }[]` (pure); `AdminWelcome` async Server Component reading `getAdminProfile()`.

- [ ] **Step 1: Install and configure**

```bash
npm i -D @vitejs/plugin-react-swc @testing-library/react @testing-library/jest-dom jsdom
```
`vitest.config.ts` becomes:

```ts
import { resolve } from "node:path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

// Unit tests (*.test.ts) run in node; component tests (*.test.tsx) run in
// jsdom. See .claude/skills/nextjs-conventions/references/testing.md.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": resolve(__dirname) } },
  test: {
    environment: "node",
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
```
Create `vitest.setup.ts`: `import "@testing-library/jest-dom/vitest";`

- [ ] **Step 2: Red — `modules/admin/lib/welcome-links.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { welcomeLinks } from "@/modules/admin/lib/welcome-links";

describe("welcomeLinks", () => {
  it("lists only the modules the permissions allow", () => {
    expect(welcomeLinks(["users-view", "gallery-view"]).map((l) => l.href)).toEqual([
      "/admin/users",
      "/admin/gallery",
    ]);
  });
  it("always offers the change-password screen", () => {
    expect(welcomeLinks([]).map((l) => l.href)).toEqual(["/admin/settings"]);
  });
});
```
Run: FAIL, module not found.

- [ ] **Step 3: Green — `modules/admin/lib/welcome-links.ts`**

```ts
// The admin landing page's entry points, in menu order, filtered by the
// profile's flat permission list. Pure so the rule lives in one tested place.
type WelcomeLink = { href: string; label: string; description: string; permission: string | null };

const LINKS: WelcomeLink[] = [
  { href: "/admin/users", label: "Users", description: "Registered accounts.", permission: "users-view" },
  { href: "/admin/contents", label: "Contents", description: "Site copy blocks.", permission: "contents-view" },
  { href: "/admin/gallery", label: "Gallery", description: "Uploaded images.", permission: "gallery-view" },
  { href: "/admin/broadcasts", label: "Broadcasts", description: "Announcements to users.", permission: "notifications-broadcast" },
  { href: "/admin/administrators", label: "Administrators", description: "Console accounts.", permission: "administrators-view" },
  { href: "/admin/access-control", label: "Roles", description: "Roles and permissions.", permission: "roles-view" },
  { href: "/admin/audit-logs", label: "Audit logs", description: "Who changed what.", permission: "audit-logs-view" },
  { href: "/admin/auth-attempt-logs", label: "Auth attempts", description: "Sign-in history.", permission: "auth-logs-view" },
  { href: "/admin/connection-logs", label: "Connection logs", description: "Outbound calls.", permission: "connection-logs-view" },
  { href: "/admin/feature-flags", label: "System controls", description: "Maintenance mode.", permission: "developer-access" },
  { href: "/admin/settings", label: "Change password", description: "Your own credentials.", permission: null },
];

export function welcomeLinks(permissions: readonly string[]) {
  return LINKS.filter((l) => l.permission === null || permissions.includes(l.permission)).map(
    ({ href, label, description }) => ({ href, label, description }),
  );
}
```
Run: PASS.

- [ ] **Step 4: Red — `admin-welcome.test.tsx`** (mock the profile read):

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/admin/lib/get-admin-profile", () => ({
  getAdminProfile: vi.fn(async () => ({
    name: "Sam Admin",
    roles: [{ name: "Editor" }],
    permissions: ["contents-view"],
  })),
}));

import { AdminWelcome } from "@/modules/admin/components/admin-welcome";

describe("AdminWelcome", () => {
  it("greets the admin, names the role and links only permitted modules", async () => {
    render(await AdminWelcome());
    expect(screen.getByRole("heading", { name: /welcome, sam admin/i })).toBeInTheDocument();
    expect(screen.getByText(/editor/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /contents/i })).toHaveAttribute("href", "/admin/contents");
    expect(screen.queryByRole("link", { name: /^users$/i })).toBeNull();
  });
});
```
Check `types/administrator.ts` for the real field names (`name` vs `first_name`, `roles` shape) and adjust the mock. Run: FAIL, module not found.

- [ ] **Step 5: Green — `admin-welcome.tsx`**

```tsx
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminProfile } from "@/modules/admin/lib/get-admin-profile";
import { welcomeLinks } from "@/modules/admin/lib/welcome-links";

// The admin landing page: no data beyond the memoized profile read the shell
// already performs. Projects add live figures here once their backend grows a
// summary endpoint.
export async function AdminWelcome() {
  const profile = await getAdminProfile();
  const name = profile?.name ?? "there";
  const roles = (profile?.roles ?? []).map((r) => r.name).join(", ");
  const links = welcomeLinks(profile?.permissions ?? []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {name}</h1>
        {roles && <p className="text-sm text-muted-foreground">{roles}</p>}
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="block h-full rounded-xl focus-visible:outline-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>{l.label}</CardTitle>
                  <CardDescription>{l.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```
Adjust field access to the real `Administrator` type. Run: PASS.

- [ ] **Step 6: Page** — `app/admin/(dashboard)/page.tsx`:

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminWelcome } from "@/modules/admin/components/admin-welcome";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div aria-hidden className="h-40 animate-pulse rounded-xl bg-muted" />}>
      <AdminWelcome />
    </Suspense>
  );
}
```
Delete the old dashboard files. Gate, then commit: `git commit -m "Static admin welcome page; component test setup"`.

---

### Task 11: Neutral landing page, root metadata, logo

**Files:**
- Modify: `modules/landing/components/hero.tsx` (rewrite), `app/(site)/page.tsx`, `app/layout.tsx`, `components/layout/logo.tsx`, `modules/landing/components/landing-json-ld.tsx` (organisation name and url from env; delete the government URL), `modules/admin/components/admin-login-form.tsx:204` (placeholder `admin@example.com`)
- Delete: remaining `modules/landing/components/*` except `hero.tsx`, `hero-console.tsx` (only if brand-free after edit; otherwise delete), `landing-json-ld.tsx`; `app/(site)/loading.tsx` if it skeletons removed sections
- Create: `modules/landing/components/hero.test.tsx`, `app/icon.svg`

- [ ] **Step 1: Red — `hero.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_APP_NAME: "Acme Portal" } }));
vi.mock("next/link", () => ({ default: (p: React.ComponentProps<"a">) => <a {...p} /> }));

import { Hero } from "@/modules/landing/components/hero";

describe("Hero", () => {
  it("names the product from the environment and offers sign-in", () => {
    render(<Hero />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Acme Portal");
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /create an account/i })).toHaveAttribute("href", "/register");
  });
});
```
Run: FAIL (current hero has no env text and a different link set).

- [ ] **Step 2: Green — `hero.tsx`** (synchronous, no session read, PPR-static):

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";

export function Hero() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-5xl px-6 py-24 text-center sm:py-32">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">{env.NEXT_PUBLIC_APP_NAME}</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Replace this hero with the product's own message. Accounts, notifications and
          the admin console are already wired to the API.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Button nativeButton={false} render={<Link href="/login" />}>Log in</Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/register" />}>
            Create an account
          </Button>
        </div>
      </div>
    </section>
  );
}
```
`app/(site)/page.tsx` renders `<LandingJsonLd />` and `<Hero />` only; metadata description "Sign in or create an account." with `openGraph.title` and `twitter.title` set to `env.NEXT_PUBLIC_APP_NAME`. Run: PASS.

- [ ] **Step 3: Root metadata** in `app/layout.tsx`:

```ts
title: { default: env.NEXT_PUBLIC_APP_NAME, template: `%s · ${env.NEXT_PUBLIC_APP_NAME}` },
description: `${env.NEXT_PUBLIC_APP_NAME} account portal and administration console.`,
```

- [ ] **Step 4: Logo** — `components/layout/logo.tsx` renders an inline SVG mark plus the app name:

```tsx
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold", className)}>
      <svg aria-hidden viewBox="0 0 24 24" className="size-6 text-primary" fill="currentColor">
        <rect x="2" y="2" width="20" height="20" rx="5" />
      </svg>
      <span>{env.NEXT_PUBLIC_APP_NAME}</span>
    </span>
  );
}
```
Create `app/icon.svg` with the same rounded square in a neutral colour. Remove `app/icon.png`.

- [ ] **Step 5: Gate, then commit** `git commit -m "Neutral landing, metadata and logo driven by NEXT_PUBLIC_APP_NAME"`.

---

### Task 12: Deployment files

**Files:**
- Modify: `Dockerfile`, `docker-compose.yml`, `nginx.conf`, `.dockerignore`, `.gitignore`

- [ ] **Step 1: Dockerfile** — build ARG defaults: `NEXT_PUBLIC_API_URL=http://localhost:8000/api`, `API_URL=http://localhost:8000/api`, `NEXT_PUBLIC_REVERB_HOST=localhost`, `NEXT_PUBLIC_REVERB_APP_KEY=local`, `NEXT_PUBLIC_REVERB_PORT=8080`, `NEXT_PUBLIC_REVERB_FORCE_TLS=false`, add `NEXT_PUBLIC_APP_NAME=App`. Remove the SSO partner code ARG.
- [ ] **Step 2: docker-compose.yml** — `image: template-frontend:latest`, same defaults, remove `secrets:` and any `./secrets` volume; keep `BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET:?}`.
- [ ] **Step 3: nginx.conf** — `server_name example.com;`, file-name guidance `template-frontend.conf`.
- [ ] **Step 4: `.gitignore`** keep as-is minus `*-sa.json`, `*service-account*.json`, `/secrets/` lines (nothing generates them any more); keep `.env*` and add `!.env.example`.
- [ ] **Step 5: Gate, then commit** `git commit -m "Neutralise Docker, compose and nginx defaults"`.

---

### Task 13: Docs, TODO, CLAUDE.md, README, env example, CI

**Files:**
- Create: `.env.example`, `README.md` (replace), `TODO.md`, `docs/README.md`, `docs/superpowers/README.md`, `docs/handoff/README.md`, `docs/handoff/2026-09-15-example-feature-fe-handoff.md`, `docs/qa/README.md`, `docs/qa/2026-09-15-0900-qa-example.md`, `.github/workflows/ci.yml`, `.claude/working-rules.md`
- Modify: `CLAUDE.md`, `.claude/skills/nextjs-conventions/SKILL.md` (frontmatter description), `package.json` (`"name": "template-frontend"`, add `"typecheck": "tsc --noEmit"`), `AGENTS.md` (keep)

- [ ] **Step 1: `.env.example`** — one line per variable `lib/env.ts` validates, values `http://localhost:8000/api`, `http://localhost:3000`, `App`, `1x00000000000000000000AA`, empty `SLACK_ERROR_WEBHOOK_URL=`, `BETTER_AUTH_SECRET=` with a comment `# openssl rand -base64 32`, Reverb `local`/`localhost`/`8080`/`false`, `NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB=5`.

- [ ] **Step 2: `docs/*`** — copy the four READMEs from `../backend/docs/` verbatim, replacing "Backend → frontend contract" wording with "Backend → frontend contract consumed by this app" in `handoff/README.md`; adapt the two exemplars to a frontend feature (a screen consuming an endpoint; a QA plan for the login flow).

- [ ] **Step 3: `TODO.md`** — backend format with headings: Authentication, Users, Administrators, Notifications, Content, Testing, Deployment / CI-CD, Cleanup, Future. Open items:
  - Content: "Documentations CRUD screen — the backend template serves `administrator/documentations`; the reference frontend never had a screen. Build it by cloning `modules/content` when a project needs it."
  - Testing: "Component tests cover only the welcome page and hero; forms are untested beyond their schemas because the reference suite was node-only."
  - Deployment / CI-CD: "`.github/workflows/ci.yml` lives in `frontend/`; GitHub only runs workflows from the repository root. Move it (with `working-directory: frontend`) once the repository layout is final."

- [ ] **Step 4: `CLAUDE.md`** — keep the reference's non-negotiables; replace "Project state" with a "Repository layout" section (docs taxonomy, `TODO.md`, `.claude/working-rules.md`); add "Commands" (`npm run dev|build|lint|typecheck|test`); add the backend's Engineering Principles, `.env` rule, TDD cycle, and Branching & PR rules verbatim; keep "Before starting UI work: ask for 3 theme colors"; delete the "When a URL path changes" paragraph's references to project/api_catalog and keep the rule about `notification-content.ts`.

- [ ] **Step 5: `README.md`**

```markdown
# Frontend workspace

A Next.js 16 project template with the conventions and hardening of a production
app already in place. Copy it, set `.env`, point it at the backend template, and
start on features.

## Layout
| Path | What it is |
|---|---|
| `app/` | Routes only (segments + page/layout/loading/error/route) |
| `modules/<feature>/` | All implementation, one folder per feature |
| `components/`, `hooks/`, `lib/`, `types/` | Shared code |
| `docs/` | Design specs, plans, handoffs, QA plans |
| `.claude/skills/nextjs-conventions/` | The house architecture; `CLAUDE.md` restates its non-negotiables |
| `TODO.md` | Deferred work, grouped by area |

## What is included
- Two audiences on Better Auth: user (register with email/SMS OTP, 2FA, trusted
  device, profile, contacts, notifications) and administrator (2FA, temporary
  password gate, administrators, roles, users, contents, gallery, broadcasts,
  audit/auth/connection logs, maintenance mode)
- Server-side reads, server-action mutations, PPR, URL-driven filters
- Realtime notifications over Laravel Reverb
- PSGC address lookups (the backend's address reference data)
- Vitest (node + jsdom), ESLint, GitHub Actions CI, Docker + nginx

## Getting started
cp .env.example .env && npm ci && npm run dev

## Deploy prerequisites
The backend's `CORS_ALLOWED_ORIGINS` and `REVERB_ALLOWED_ORIGINS` must list this
app's origin. Set `NEXT_PUBLIC_APP_NAME`; it is the only place the product name lives.

## CI
`.github/workflows/ci.yml` runs lint, type-check and tests. GitHub only reads
workflows at the repository root: if this folder stays inside a larger
repository, move the file there and add `working-directory: frontend`.
```
(Write the getting-started line as a fenced bash block.)

- [ ] **Step 6: `.github/workflows/ci.yml`**

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm audit --audit-level=high
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
```

- [ ] **Step 7: `.claude/working-rules.md`** — copy the backend's; Environment notes become: run `npm run lint`, `npm run typecheck`, `npm test` from `frontend/`; `npm run build` needs a throwaway `BETTER_AUTH_SECRET` of 32+ characters.

- [ ] **Step 8: SKILL.md frontmatter** description starts "The house architecture for production Next.js 16 App Router frontends against a Laravel API." Remove the personal name.

- [ ] **Step 9: Gate, then commit** `git commit -m "Docs, TODO, CI and env example for the frontend template"`.

---

### Task 14: Origin sweep and final verification

- [ ] **Step 1: Sweep**

```bash
grep -rniE 'egov|dict\b|gov\.ph|oueg|hackathon|citizen|philippine|bagong|vertex|gemini' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude=package-lock.json . | grep -v '^./docs/superpowers/'
```
Fix every hit: UI copy becomes neutral wording ("user" for "citizen"), fixture emails become `user@example.com`, test URLs become `https://api.example.com`. The spec and plan under `docs/superpowers/` may name the reference path; nothing else may.

- [ ] **Step 2: Dependency check**

```bash
npm ls --depth=0 2>&1 | grep -E 'extraneous|missing|UNMET' ; npx depcheck || true
```
Remove anything unused that depcheck reports and no file imports (verify with grep before removing).

- [ ] **Step 3: Full build**

```bash
BETTER_AUTH_SECRET=throwaway-build-secret-0123456789abcdef npm run build
```
Expected: builds; `prebuild` runs lint and tests.

- [ ] **Step 4: Route walk** — `npm run dev` and load `/`, `/login`, `/register`, `/forgot-password`, `/faqs`, `/privacy-policy`, `/terms-of-service`, `/dashboard` (redirects to login), `/admin/login`, `/admin` (redirects to login). Expected: no 404, no console error from a pruned import.

- [ ] **Step 5: Commit** `git commit -m "Origin sweep and verification"`.
