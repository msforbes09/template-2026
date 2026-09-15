# Admin CRUD Blueprint

Generate this **only when the user explicitly says "CRUD"** (e.g., "create CRUD for Users"). Partial requests get only the requested piece. Anything beyond create/read/update/delete (bulk actions, export, status toggles) — ask first.

## File structure

`app/` holds only the route segment and its routing files. The list is a plain Suspense-wrapped section in `page.tsx` — **no `@list` parallel slot** (parallel routes are dashboards/intercepting-modals only). All implementation lives in `modules/users/`.

```
app/(admin)/users/
├── page.tsx                     // shell + <Suspense><UsersList/></Suspense>
├── loading.tsx
└── error.tsx

modules/users/
├── components/
│   ├── user-form.tsx            // shared by create + edit
│   ├── create-user-modal.tsx    // client-state modal (useState)
│   ├── edit-user-modal.tsx      // client-state modal (useState)
│   ├── delete-user-dialog.tsx
│   ├── user-columns.tsx         // TanStack column defs
│   ├── users-toolbar.tsx        // debounced search → URL params (uncontrolled input, no useState)
│   ├── users-pagination.tsx     // page controls → URL params (no useState)
│   ├── users-list.tsx           // dynamic fetch + DataTable body
│   ├── users-list-skeleton.tsx  // mirrors users-list dimensions (toolbar + N rows + pagination)
│   └── edit-modal-skeleton.tsx  // mirrors user-form field layout
├── actions/
│   └── user-actions.ts          // server actions: create/update/delete + revalidateTag
├── schemas/
│   └── user-schema.ts           // zod
└── types.ts
```

## page.tsx — shell + Suspense list section

```tsx
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { CreateUserModal } from "@/modules/users/components/create-user-modal";
import { UsersList } from "@/modules/users/components/users-list";
import { UsersListSkeleton } from "@/modules/users/components/users-list-skeleton";

export const metadata = {
  title: "Users",
  description: "Manage application users.",
  openGraph: { title: "Users", description: "Manage application users." },
};

type UsersSearchParams = Promise<{ q?: string; page?: string }>;

// NOT async, and never touches `searchParams` itself — it only forwards the
// Promise, unread, into the Suspense boundary. That's what keeps this page's
// shell (PageHeader, the <Suspense> wrapper) statically prerenderable.
export default function UsersPage({
  searchParams,
}: {
  searchParams: UsersSearchParams;
}) {
  return (
    <main>
      <h1 className="sr-only">Users</h1>
      <PageHeader title="Users" action={<CreateUserModal />} />
      <Suspense fallback={<UsersListSkeleton />}> {/* matches UsersList — no layout shift */}
        <UsersList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
```

> The temptation is to write `export default async function UsersPage(...)` and do `const { q, page } = await searchParams` right at the top, then pass the plain strings down. **Don't** — that `await` runs as part of the page's own render, before (and outside of) the `<Suspense>` boundary, so it makes the *whole page* dynamic no matter how the resulting values get used afterward. Passing the unresolved Promise down and awaiting it only inside `UsersList` — which runs inside the boundary — is what actually preserves PPR. `loading.tsx` reuses the same `UsersListSkeleton`.

## modules/users/components/users-list.tsx — the dynamic body

```tsx
import { apiFetch } from "@/lib/api-client";
import { requireSession } from "@/lib/auth/dal";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { UsersToolbar } from "@/modules/users/components/users-toolbar";
import { UsersPagination } from "@/modules/users/components/users-pagination";
import { userColumns } from "@/modules/users/components/user-columns";

export async function UsersList({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireSession("admin"); // guard inside the dynamic (Suspense) boundary — keeps PPR
  const { q = "", page = "1" } = await searchParams; // awaited HERE — inside the boundary, not at the page root
  const { data, meta } = await apiFetch<{ data: User[]; meta: PageMeta }>(
    `/users?search=${encodeURIComponent(q)}&page=${page}`,
    { next: { tags: ["users"] } },
    "admin",
  );

  return (
    <section aria-label="User list">
      <UsersToolbar />
      {data.length === 0 ? (
        <EmptyState title="No users found" description="Try a different search or create one." />
      ) : (
        <>
          <DataTable columns={userColumns} data={data} />
          <UsersPagination meta={meta} />
        </>
      )}
    </section>
  );
}
```

## modules/users/actions/user-actions.ts — server actions

```tsx
"use server";
import { apiFetch } from "@/lib/api-client";
import { requireSession } from "@/lib/auth/dal";
import { revalidateTag } from "next/cache";

export async function createUser(values: UserInput) {
  await requireSession("admin");
  const { data } = await apiFetch<{ data: User }>("/users", {
    method: "POST",
    body: JSON.stringify(values),
  }, "admin");
  revalidateTag("users");
  return data;
}

export async function updateUser(id: string, values: UserInput) {
  await requireSession("admin");
  const { data } = await apiFetch<{ data: User }>(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(values),
  }, "admin");
  revalidateTag("users");
  revalidateTag(`users:${id}`);
  return data;
}

export async function deleteUser(id: string) {
  await requireSession("admin");
  await apiFetch(`/users/${id}`, { method: "DELETE" }, "admin");
  revalidateTag("users");
  revalidateTag(`users:${id}`);
}
```

> These are shown happy-path for brevity. In real actions wrap the body in try/catch and return the `ActionResult` shape with dev/prod-safe messages — `apiFetch` already logs API errors to Slack (the logging section in `error-handling.md`); the action only logs *unexpected* errors and returns a generic message for 5xx in production (`error-handling.md`).

> Every action opens with `requireSession(audience)` before any backend call. `proxy.ts` may have already redirected unauthenticated navigation, but actions can be invoked directly, so they must guard independently — the backend is the final authority, but the guard avoids tokenless calls and gives a clean redirect.

## Toolbar — URL search params as source of truth (debounced, no useState)

Search/filter/pagination state lives in the URL, never in `useState`. A small shared hook centralizes the read-modify-`replace` so the toolbar and pagination both use it.

```tsx
// hooks/use-update-search-params.ts (shared)
"use client";
import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function useUpdateSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return useCallback(
    (updates: Record<string, string | null>, opts?: { resetPage?: boolean }) => {
      const next = new URLSearchParams(params);
      for (const [key, value] of Object.entries(updates)) {
        value ? next.set(key, value) : next.delete(key);
      }
      if (opts?.resetPage) next.delete("page");
      router.replace(`${pathname}?${next.toString()}`); // replace, not push
    },
    [router, pathname, params]
  );
}
```

```tsx
// modules/users/components/users-toolbar.tsx
"use client";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { debounce } from "lodash-es";
import { Input } from "@/components/ui/input";
import { useUpdateSearchParams } from "@/hooks/use-update-search-params";

export function UsersToolbar() {
  const params = useSearchParams();
  const update = useUpdateSearchParams();

  // debounce the write; reset to page 1 on a new search.
  // depends on `update` (memoized in the hook), so it's stable across renders.
  const onSearch = useMemo(
    () => debounce((value: string) => update({ q: value || null }, { resetPage: true }), 300),
    [update],
  );

  return (
    <Input
      aria-label="Search users"
      defaultValue={params.get("q") ?? ""}        // uncontrolled — URL is the truth, not useState
      onChange={(e) => onSearch(e.target.value)}
      placeholder="Search users…"
    />
  );
}
```

> The input is **uncontrolled** (`defaultValue`, not `value`+`useState`). The canonical value is the URL; `defaultValue` only seeds the initial render (e.g. on a shared/bookmarked link).

## Pagination — writes `page` to the URL (no useState)

```tsx
// modules/users/components/users-pagination.tsx (or the shared TablePagination)
"use client";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useUpdateSearchParams } from "@/hooks/use-update-search-params";

export function UsersPagination({ meta }: { meta: PageMeta }) {
  const params = useSearchParams();
  const update = useUpdateSearchParams();
  const current = Number(params.get("page") ?? "1");

  return (
    <nav aria-label="Pagination" className="flex items-center gap-2">
      <Button
        variant="outline"
        disabled={current <= 1}
        aria-label="Previous page"
        onClick={() => update({ page: String(current - 1) })}
      >
        Previous
      </Button>
      <span>Page {meta.current_page} of {meta.last_page}</span>
      <Button
        variant="outline"
        disabled={current >= meta.last_page}
        aria-label="Next page"
        onClick={() => update({ page: String(current + 1) })}
      >
        Next
      </Button>
    </nav>
  );
}
```

## Delete — ConfirmDialog

```tsx
"use client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteUser } from "@/modules/users/actions/user-actions";
import { useToast } from "@/components/ui/use-toast";

export function DeleteUserDialog({ id }: { id: string }) {
  const { toast } = useToast();
  return (
    <ConfirmDialog
      title="Delete user?"
      description="This action cannot be undone."
      onConfirm={async () => {
        await deleteUser(id);
        toast({ title: "User deleted" });
      }}
    />
  );
}
```
