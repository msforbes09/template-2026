import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Can } from "@/modules/admin/components/can";
import { PERMISSIONS } from "@/modules/admin/lib/admin-can";
import { CreateRoleModal } from "@/modules/access-control/components/create-role-modal";
import { RolesList } from "@/modules/access-control/components/roles-list";
import { RolesListSkeleton } from "@/modules/access-control/components/roles-list-skeleton";

export const metadata: Metadata = {
  title: "Access Control",
  robots: { index: false, follow: false },
};

// Reads the searchParams promise itself — kept out of the page component so
// awaiting it doesn't force the whole page (including the static PageHeader
// below) behind the route's loading.tsx boundary. Only this Suspense-wrapped
// piece should wait on it (see searchparams_ppr_boundary memory).
async function RolesListForParams({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  return <RolesList q={q} page={page} />;
}

export default function AccessControlPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Access Control"
        description="Manage roles and the permissions they grant."
        action={
          <Can permission={PERMISSIONS.rolesManage}>
            <CreateRoleModal />
          </Can>
        }
      />
      <Suspense fallback={<RolesListSkeleton />}>
        <RolesListForParams searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
