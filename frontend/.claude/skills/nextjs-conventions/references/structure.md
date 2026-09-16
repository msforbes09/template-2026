# Project Structure & App Shell

Read for the folder layout (app = routes only, modules = features), the root providers/metadata wiring, the per-audience layout shells (site header/footer, admin sidebar/header/content), and the "client components only at the leaves" rule.

`app/` is **routing only**. It contains route segments and their routing files (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `default.tsx`, `route.ts`) and parallel/intercepting route folders. Nothing else — no component bodies, no hooks, no utilities, no business logic. A route file should mostly compose pieces imported from `modules/` and `components/`.

All implementation lives in dedicated top-level folders:

```
src/                            // (or repo root)
├── app/                        // ROUTES ONLY — segments + page/layout/loading/error/default/route
│   ├── layout.tsx              // root layout: <html>, providers, default metadata
│   ├── (site)/                 // public audience route group
│   │   ├── layout.tsx          // SiteHeader + {children} + SiteFooter
│   │   └── …                   // public pages
│   └── (admin)/                // admin audience route group
│       ├── layout.tsx          // AdminSidebar + AdminHeader + content pane
│       └── users/
│           ├── page.tsx        // shell: composes from modules/users + <Suspense>
│           ├── loading.tsx
│           └── error.tsx
├── modules/                    // feature-specific implementation, one folder per feature
│   ├── site/components/        // SiteHeader, SiteFooter (+ client leaves: MobileMenuToggle…)
│   ├── admin/components/       // AdminSidebar, AdminHeader (+ client leaves: NavLink…)
│   └── users/
│       ├── components/         // user-form, create/edit modals, columns, list, skeletons…
│       ├── actions/            // server actions (createUser, updateUser, deleteUser)
│       ├── hooks/              // feature hooks (use-users-filter…)
│       ├── schemas/            // zod schemas
│       └── types.ts            // feature types
├── components/                 // shared, app-wide UI
│   ├── ui/                     // shadcn primitives + wrappers (AppFormField, DataTable, PageHeader…)
│   └── layout/                 // shared layout bits reused across shells (Logo…)
├── hooks/                      // shared, app-wide hooks (use-update-search-params, use-toast…)
├── lib/                        // shared utilities + clients (api-client, api-error, action-result, auth/ + dal, log-error, report-error, format, env, utils…)
└── types/                      // shared/global types
```

Rules:
- A route file imports its feature code from `modules/<feature>/…`, never defines it inline.
- Feature-specific code (only used by one feature) → `modules/<feature>/`.
- Shared code (used by 2+ features) → top-level `components/` · `hooks/` · `lib/` · `types/`.
- Promote from `modules/<feature>/` to a shared folder only when a second feature needs it.

```tsx
// app/(admin)/users/page.tsx — route file stays thin, just composes
import { PageHeader } from "@/components/ui/page-header";
import { CreateUserModal } from "@/modules/users/components/create-user-modal";

export const metadata = { title: "Users", description: "Manage application users." };

export default function UsersPage({ list }: { list: React.ReactNode }) {
  return (
    <main>
      <h1 className="sr-only">Users</h1>
      <PageHeader title="Users" action={<CreateUserModal />} />
      {list}
    </main>
  );
}
```

> Older examples in this skill use `app/<route>/_components/…` co-location. Prefer the `modules/<feature>/` layout above; treat `_components`/`_actions` only as a fallback when a piece is genuinely throwaway and bound to a single route.

---

## App Shell & Providers

Toasts, the confirm dialog, and SWR all need providers mounted once at the root. The root layout also sets the default site metadata that page-level metadata extends.

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";       // shadcn toast portal
import { ConfirmProvider } from "@/components/ui/confirm-dialog"; // if using imperative confirm
import { SWRProvider } from "@/components/providers/swr-provider";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: { default: "Acme", template: "%s · Acme" }, // page titles fill %s
  description: "Acme — default site description.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SWRProvider>
          {children}
          <Toaster />
        </SWRProvider>
      </body>
    </html>
  );
}
```

> The `Toaster` provides the `aria-live` region that announces toasts without stealing focus — keep it mounted once at the root. Use polite announcements for success/info and assertive only for urgent errors; never put the only copy of critical info in an auto-dismissing toast. See `accessibility.md`.

```tsx
// components/providers/swr-provider.tsx — global SWR defaults (client)
"use client";
import { SWRConfig } from "swr";
export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ revalidateOnFocus: false, dedupingInterval: 300 }}>
      {children}
    </SWRConfig>
  );
}
```

Required env: `NEXT_PUBLIC_SITE_URL` (for `metadataBase` + OpenGraph absolute URLs), `API_URL` (backend base), `BETTER_AUTH_SECRET`, `SLACK_ERROR_WEBHOOK_URL` (server-only error logging, the logging section in `error-handling.md`).

> `ConfirmProvider` is only needed if `ConfirmDialog` is used imperatively; the inline `<ConfirmDialog>` (`ui-primitives.md`) needs no provider. Keep whichever matches your `components/ui/confirm-dialog.tsx`.

---

## Layout shells (per audience)

Each audience gets its own **route-group layout** that composes a reusable shell from server-rendered pieces. The shells live in `modules/<audience>/components/` (or a shared `components/layout/` if reused), and the layout file just wires them around `{children}`.

- **`(site)/layout.tsx`** — public site shell: `SiteHeader` (logo + nav) at top, `{children}` in the middle, `SiteFooter` at the bottom. Header and footer are reusable across every public page.
- **`(admin)/layout.tsx`** — admin shell: `AdminSidebar` (logo + main menu) on the side, `AdminHeader` on top, and a content pane that receives `{children}`.

The shell components (`SiteHeader`, `SiteFooter`, `AdminSidebar`, `AdminHeader`) are **Server Components** — they render on the server so nav links, logo, and static chrome are part of the prerendered HTML and don't ship JS. Only the genuinely interactive bits inside them (a mobile-menu toggle, a user dropdown, an active-link highlighter) are extracted into small `"use client"` **leaf** components (see the client-at-the-leaves rule below).

```tsx
// app/(site)/layout.tsx — public shell
import { SiteHeader } from "@/modules/site/components/site-header";
import { SiteFooter } from "@/modules/site/components/site-footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />              {/* server component; reusable */}
      <main className="flex-1">{children}</main>
      <SiteFooter />             {/* server component; reusable */}
    </div>
  );
}
```

```tsx
// app/(admin)/layout.tsx — admin shell (sidebar + header + content pane)
import { AdminSidebar } from "@/modules/admin/components/admin-sidebar";
import { AdminHeader } from "@/modules/admin/components/admin-header";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-[16rem_1fr]">
      <AdminSidebar />           {/* logo + main menu; server component */}
      <div className="flex flex-col">
        <AdminHeader />          {/* top bar; server component */}
        <main className="flex-1 overflow-auto p-6">{children}</main> {/* content pane */}
      </div>
    </div>
  );
}
```

```tsx
// modules/admin/components/admin-sidebar.tsx — server component
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { NavLink } from "@/modules/admin/components/nav-link"; // client leaf (active state)

const menu = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
];

export function AdminSidebar() {
  return (
    <aside className="border-r">
      <Link href="/admin" aria-label="Admin home"><Logo /></Link>
      <nav aria-label="Main">
        {menu.map((m) => <NavLink key={m.href} href={m.href}>{m.label}</NavLink>)}
      </nav>
    </aside>
  );
}
```

> The sidebar/header themselves stay server components; only `NavLink` (which reads `usePathname()` for the active state) and things like a mobile drawer toggle are `"use client"`. That keeps the shell out of the client bundle.

## Client components only at the leaves

Push `"use client"` **as far down the tree as possible** — a client component should be a *leaf* (or near-leaf), never a wrapper around large subtrees. The moment a component is marked `"use client"`, its entire imported subtree is client-rendered and shipped as JS, and it can no longer contain async Server Components — which breaks PPR and server data access.

Rules:
- Default every component to a **Server Component**. Add `"use client"` only to the specific piece that needs a hook, an event handler, or browser API (`useState`, `useEffect`, `onClick`, `usePathname`, etc.).
- **Don't** put `"use client"` on a layout, page, section, or shell. Extract the interactive bit into a small child and mark *that* instead.
- Pass server-rendered content into client components via `children`/props rather than importing server components inside a client component. A client component can *render* `{children}` that were produced on the server.
- Fetch on the server, then hand data down to a client leaf as props — never convert a component to client just to fetch (that violates the data-access rule too).

```tsx
// ❌ wrong — whole header becomes client, ships nav + logo as JS, can't be async
"use client";
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (<header><Logo/><Nav/><button onClick={() => setOpen(!open)}>Menu</button></header>);
}

// ✅ right — header stays server; only the toggle is a client leaf
export function SiteHeader() {              // server component
  return (<header><Logo/><Nav/><MobileMenuToggle/></header>);
}
// modules/site/components/mobile-menu-toggle.tsx
"use client";
export function MobileMenuToggle() {         // small client leaf
  const [open, setOpen] = useState(false);
  return <button aria-expanded={open} aria-label="Toggle menu" onClick={() => setOpen(!open)}>☰</button>;
}
```

> Quick test: if a `"use client"` component imports another component that itself only renders static markup or needs server data, you've marked it too high — move the directive down to the actual interactive element.
