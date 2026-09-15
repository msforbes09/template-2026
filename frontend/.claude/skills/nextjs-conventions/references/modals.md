# Create / Edit Modal Pattern

Read for the client-state modal pattern: ResourceModal shell + shared form, edit fetch via server action, matched skeleton.

> **Accessibility:** the modal must have an accessible title wired via `DialogTitle`, and focus must move into it on open and return to the trigger on close — `ResourceModal` (shadcn `Dialog`) handles both; don't disable them, and don't `autoFocus` a destructive control. Full dialog rules in `accessibility.md`.

Create and edit flows use **modals, not separate pages**. Pattern: a `ResourceModal` shell + a shared `[feature]-form.tsx` used by both create and edit.

- The **edit** modal fetches fresh data on open via a **server action** (which runs `apiFetch` GET server-side), awaits it, and shows a skeleton while pending. No client-side GET (per `data-fetching.md`). The skeleton is **feature-specific** (`modules/[feature]/components/edit-modal-skeleton.tsx`) and must mirror that form's layout — same number of fields, same heights and spacing as `[feature]-form.tsx` — so the modal doesn't resize when the form swaps in (per the skeleton-sizing rule in `data-fetching.md`). A generic spacing-only shell can't match a specific form, so it lives with the feature, not in `components/ui/`.
- Mutations on submit go through server actions too (POST/PUT). The browser client is **not** used here.
- On success: close the modal → `revalidateTag(...)` inside the server action → fire a `useToast` success toast.
- **Failure handling:** the open-fetch action returns the same `ActionResult` shape (`error-handling.md`). A 401 → close modal + redirect to the audience login; any other error → show an inline error state inside the modal (not a skeleton forever) with a retry.

> `useState` here is fine — modal open/close, the fetched record, and the in-flight flag are ephemeral UI state. This is the *only* category `useState` is for. Search, filters, sorting, and pagination never use `useState`; they live in the URL (`seo.md`).

```tsx
// modules/users/actions/user-actions.ts (add alongside create/update/delete)
"use server";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { requireSession } from "@/lib/auth/dal";
import type { ActionResult } from "@/lib/action-result";

export async function getUser(id: string): Promise<ActionResult<User>> {
  await requireSession("admin"); // guard before the GET
  try {
    const { data } = await apiFetch<{ data: User }>(
      `/users/${id}`,
      { next: { tags: [`users:${id}`] } },
      "admin",
    );
    return { ok: true, data };
  } catch (err) {
    if (isApiError(err)) {
      // safeErrorMessage, not err.message — a 5xx carries backend internals
      // (error-handling.md). The masking rule applies to every outbound path.
      return { ok: false, status: err.status, message: safeErrorMessage(err), errors: err.errors };
    }
    return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
  }
}
```

```tsx
// modules/users/components/edit-user-modal.tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ResourceModal } from "@/components/ui/resource-modal";
import { UserForm } from "./user-form";
import { EditUserModalSkeleton } from "@/modules/users/components/edit-modal-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { getUser } from "@/modules/users/actions/user-actions";

export function EditUserModal({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function load() {
    setUser(null);
    setError(null); // both null → skeleton
    startTransition(async () => {
      const res = await getUser(id);
      if (res.ok) return setUser(res.data);
      if (res.status === 401) { setOpen(false); router.replace("/admin/login"); return; }
      setError(res.message);
    });
  }

  function onOpen() { setOpen(true); load(); }

  return (
    <ResourceModal open={open} onOpenChange={setOpen} onOpen={onOpen} title="Edit user">
      {error ? (
        <EmptyState
          title="Couldn’t load this user"
          description={error}
          action={<Button onClick={load}>Retry</Button>}
        />
      ) : user ? (
        <UserForm defaultValues={user} />
      ) : (
        <EditUserModalSkeleton />
      )}
    </ResourceModal>
  );
}
```

See `references/crud-blueprint.md` for the full admin CRUD blueprint.

---
