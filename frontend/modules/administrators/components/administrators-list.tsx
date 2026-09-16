import Link from "next/link";
import { AlertTriangle, Users, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { AdministratorsToolbar } from "@/modules/administrators/components/administrators-toolbar";
import { AdministratorsPagination } from "@/modules/administrators/components/administrators-pagination";
import { adminCan, PERMISSIONS } from "@/modules/admin/lib/admin-can";
import {
  administratorColumns,
  administratorColumnsReadOnly,
} from "@/modules/administrators/components/administrator-columns";
import type { Administrator } from "@/types/administrator";
import type { Role } from "@/types/access-control";

const PER_PAGE = 20;

export async function AdministratorsList({
  q,
  isActive,
  // Role id — how the roles screen's admins-count link narrows this list to
  // one role's holders. No toolbar control; the URL is the source of truth.
  role,
  page,
}: {
  q: string;
  isActive: string;
  role?: string;
  page: string;
}) {
  await requireAdminSession();

  // administrators-view gets the list read-only; every row action (edit,
  // roles, reset, delete, the active switch) needs administrators-manage.
  const canManage = await adminCan(PERMISSIONS.administratorsManage);

  // Name for the filtered-by-role banner. Resolved from the roles LIST — the
  // show endpoint is roles-view-only, but the list is gated either-of, so it
  // works for exactly the admins who can reach this page. Display-only:
  // failures fall back to the raw id.
  let roleName: string | null = null;
  if (role) {
    roleName = await apiFetch<{ data: Role[] }>("/roles?per_page=100", {}, "admin")
      .then((res) => res.data.find((candidate) => String(candidate.id) === role)?.name ?? null)
      .catch(() => null);
  }

  const params = new URLSearchParams();
  if (q) params.set("search", q);
  if (isActive) params.set("is_active", isActive);
  if (role) params.set("role", role);
  params.set("page", page);
  params.set("per_page", String(PER_PAGE));

  // Caught here rather than left to throw into error.tsx: a Server Component
  // that fetches data should resolve to explicit UI on failure (this is also
  // what kept this Suspense boundary hung on its skeleton forever in testing
  // — the thrown error never made it to the nearest error boundary).
  let data: Administrator[];
  try {
    const response = await apiFetch<{ data: Administrator[] }>(
      `/administrators?${params.toString()}`,
      { next: { tags: ["administrators"] } },
      "admin",
    );
    // The backend omits `roles` entirely for some records despite the
    // documented schema always including it — normalize so the type holds.
    // The table no longer renders roles (the shield modal fetches fresh), so
    // the old per-row show-request backfill is gone with the column — it cost
    // one AUDITED pii-access read per row for badges nobody needed.
    // `photo` is nullable but has the same historical omission risk.
    data = response.data.map((admin) => ({
      ...admin,
      roles: admin.roles ?? [],
      photo: admin.photo ?? null,
    }));

  } catch (err) {
    const message = isApiError(err)
      ? err.message
      : "Something went wrong loading administrators.";
    return (
      <section aria-label="Administrator list" className="space-y-4">
        <AdministratorsToolbar />
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load administrators"
          description={message}
        />
      </section>
    );
  }

  const currentPage = Number(page) || 1;
  const hasNextPage = data.length === PER_PAGE;

  return (
    <section aria-label="Administrator list" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <AdministratorsToolbar />
        {role && (
          // The usage dashboard's scope pill, for the role link from Access
          // Control — without it the narrowed list reads as the full roster
          // missing people. The whole pill is the way out.
          <Link
            href="/admin/administrators"
            aria-label="Show all administrators"
            className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 py-1 pl-2.5 pr-2 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span className="text-muted-foreground">Role</span>
            <span className="max-w-48 truncate text-foreground">{roleName ?? `#${role}`}</span>
            <X
              aria-hidden
              className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
            />
          </Link>
        )}
      </div>
      {data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No administrators found"
          description="Try a different search or filter, or add a new administrator."
        />
      ) : (
        <>
          <DataTable
            columns={canManage ? administratorColumns : administratorColumnsReadOnly}
            data={data}
          />
          <AdministratorsPagination
            currentPage={currentPage}
            hasNextPage={hasNextPage}
          />
        </>
      )}
    </section>
  );
}
