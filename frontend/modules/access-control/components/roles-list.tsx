import { AlertTriangle, ShieldCheck, ShieldX } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { EmptyState } from "@/components/ui/empty-state";
import { RolesToolbar } from "@/modules/access-control/components/roles-toolbar";
import { RolesPagination } from "@/modules/access-control/components/roles-pagination";
import { adminCan, PERMISSIONS } from "@/modules/admin/lib/admin-can";
import { RolesTable } from "@/modules/access-control/components/roles-table";
import type { Role } from "@/types/access-control";

const PER_PAGE = 20;

export async function RolesList({ q, page }: { q: string; page: string }) {
  await requireAdminSession();

  // Strictly roles-view, checked here rather than left to the WS: its any-of
  // gate also admits administrators-view, but that exists only so the admins
  // screen's role picker can list roles when assigning them — it is not a
  // license to browse this screen, which the nav (also gated on roles-view)
  // never offered.
  if (!(await adminCan(PERMISSIONS.rolesView))) {
    return (
      <EmptyState
        icon={ShieldX}
        title="You don't have access to roles"
        description="Ask an administrator to grant you the roles-view permission."
      />
    );
  }

  // Changing a role needs roles-manage; the admins count only links out when
  // the administrators list would let them in.
  const [canManage, canViewAdministrators] = await Promise.all([
    adminCan(PERMISSIONS.rolesManage),
    adminCan(PERMISSIONS.administratorsView),
  ]);

  const params = new URLSearchParams();
  if (q) params.set("search", q);
  params.set("page", page);
  params.set("per_page", String(PER_PAGE));

  // Caught here rather than left to throw into error.tsx — see
  // nextjs16_suspense_error_boundary_bug memory: uncaught throws inside a
  // Suspense-wrapped Server Component never resolve to error.tsx in this app.
  let data: Role[];
  try {
    const response = await apiFetch<{ data: Role[] }>(
      `/roles?${params.toString()}`,
      { next: { tags: ["roles"] } },
      "admin",
    );
    data = response.data;
  } catch (err) {
    const message = isApiError(err) ? err.message : "Something went wrong loading roles.";
    return (
      <section aria-label="Role list" className="space-y-4">
        <RolesToolbar />
        <EmptyState icon={AlertTriangle} title="Couldn't load roles" description={message} />
      </section>
    );
  }

  const currentPage = Number(page) || 1;
  const hasNextPage = data.length === PER_PAGE;

  return (
    <section aria-label="Role list" className="space-y-4">
      <RolesToolbar />
      {data.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No roles found"
          description="Try a different search, or add a new role."
        />
      ) : (
        <>
          <RolesTable
            data={data}
            canManage={canManage}
            canViewAdministrators={canViewAdministrators}
          />
          <RolesPagination currentPage={currentPage} hasNextPage={hasNextPage} />
        </>
      )}
    </section>
  );
}
