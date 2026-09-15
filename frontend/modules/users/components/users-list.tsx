import { AlertTriangle, ShieldX, Users } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { UsersToolbar } from "@/modules/users/components/users-toolbar";
import { UsersTable } from "@/modules/users/components/users-table";
import { normalizeUserSearch } from "@/modules/users/lib/normalize-user-search";
import type { AdminUser } from "@/types/admin-user";
import type { Paginated } from "@/types/pagination";

const PER_PAGE = 20;

// Each status view has its own "newer first" meaning: fresh registrations for
// Draft, latest completions for Completed. The no-status view keeps the API
// default (id desc).
const STATUS_ORDER_BY: Record<string, string> = {
  draft: "created_at",
  completed: "updated_at",
};

export async function UsersList({
  q,
  isActive,
  status,
  page,
}: {
  q: string;
  isActive: string;
  status: string;
  page: string;
}) {
  await requireAdminSession();

  const params = new URLSearchParams();
  // A mobile number typed in any common form is sent canonically — the
  // backend's blind-index match is exact. Names and emails pass through.
  if (q) params.set("search", normalizeUserSearch(q));
  if (isActive) params.set("is_active", isActive);
  if (status) params.set("status", status);
  const orderBy = STATUS_ORDER_BY[status];
  if (orderBy) {
    params.set("order_by", orderBy);
    params.set("sort_by", "desc");
  }
  params.set("page", page);
  params.set("per_page", String(PER_PAGE));

  // Caught here rather than left to throw into error.tsx: a Server Component
  // that fetches data should resolve to explicit UI on failure (this is also
  // what kept this Suspense boundary hung on its skeleton forever in testing
  // — the thrown error never made it to the nearest error boundary).
  let response: Paginated<AdminUser>;
  try {
    response = await apiFetch<Paginated<AdminUser>>(
      `/users?${params.toString()}`,
      { next: { tags: ["users"] } },
      "admin",
    );
  } catch (err) {
    // 403 means the token lacks users-view — the nav already hides this
    // screen, so this is a typed URL, and it deserves a straight answer
    // rather than a generic failure (the gallery list's shape).
    if (isApiError(err) && err.status === 403) {
      return (
        <EmptyState
          icon={ShieldX}
          title="You don't have access to users"
          description="Ask an administrator to grant you the users-view permission."
        />
      );
    }
    const message = isApiError(err) ? err.message : "Something went wrong loading users.";
    return (
      <section aria-label="User list" className="space-y-4">
        <UsersToolbar />
        <EmptyState icon={AlertTriangle} title="Couldn't load users" description={message} />
      </section>
    );
  }

  const data = response.data;
  // GET /users goes through the WS's paginate(), so the envelope carries the
  // real total — same fallback as the log lists should meta ever be absent.
  const meta = response.meta ?? {
    current_page: Number(page) || 1,
    last_page: 1,
    per_page: PER_PAGE,
    total: data.length,
    from: data.length ? 1 : null,
    to: data.length || null,
  };

  return (
    <section aria-label="User list" className="space-y-4">
      <UsersToolbar />
      {data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description="Try a different search or filter."
        />
      ) : (
        <>
          <UsersTable data={data} status={status} />
          <PaginationBar meta={meta} />
        </>
      )}
    </section>
  );
}
