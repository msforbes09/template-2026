# Dashboards & Parallel/Intercepting Routes

Read for the two sanctioned uses of parallel routes: dashboards (multi-slot) and intercepting modal routes (@modal).

Parallel routes are reserved for **two cases only**:
1. **Dashboards** — multi-panel layouts (this section).
2. **Intercepting modal routes** — a `@modal` slot paired with intercepting routes (see the intercepting-modal section in `dashboards.md`).

Do **not** use parallel routes for ordinary list/index pages. A CRUD list is a plain Suspense-wrapped section inside `page.tsx` — no `@list` slot.

Dashboards **always** use parallel routes — named slots (`@x/`), each with its own `page.tsx`, `loading.tsx`, `error.tsx`, and `default.tsx`. Never compose a dashboard with Suspense alone. Parallel routes give each panel independent loading/error boundaries and streaming.

```
app/dashboard/
├── layout.tsx          // receives slots as props
├── @stats/
│   ├── page.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   └── default.tsx
├── @recent/
│   ├── page.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   └── default.tsx
└── page.tsx
```

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children, stats, recent,
}: {
  children: React.ReactNode; stats: React.ReactNode; recent: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <h1 className="sr-only">Dashboard</h1>
      <section aria-label="Statistics">{stats}</section>
      <section aria-label="Recent activity">{recent}</section>
      {children}
    </div>
  );
}
```

---

## Intercepting Modal Routes (URL-driven modals)

Use this **only** when a modal needs its own shareable, refresh-safe URL (e.g. a public/site detail overlay). It is **not** the CRUD pattern — admin CRUD create/edit modals are client-state only (see `modals.md`).

Pattern: a `@modal` parallel slot in the layout + an intercepting route (`(.)` same level, `(..)` one up). Soft navigation renders the modal overlay; a hard load/refresh of the same URL renders the full page. The slot's `default.tsx` returns `null` when no modal is active.

```
app/photos/
├── layout.tsx                 // renders {children} and {modal}
├── page.tsx                   // the grid/list
├── @modal/
│   ├── default.tsx            // returns null
│   └── (.)[id]/page.tsx       // intercepted → renders <Modal><PhotoDetail/></Modal>
└── [id]/
    └── page.tsx               // full page on hard load / refresh
```

```tsx
// app/photos/layout.tsx
export default function PhotosLayout({
  children, modal,
}: { children: React.ReactNode; modal: React.ReactNode }) {
  return <>{children}{modal}</>;
}
```

```tsx
// app/photos/@modal/default.tsx
export default function Default() {
  return null;
}
```

```tsx
// app/photos/@modal/(.)[id]/page.tsx — intercepted overlay
import { Modal } from "@/components/ui/modal";
import { PhotoDetail } from "@/modules/photos/components/photo-detail";

export default async function InterceptedPhoto({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Modal>
      <PhotoDetail id={id} />
    </Modal>
  );
}
```

---
