import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Can } from "@/modules/admin/components/can";
import { PERMISSIONS } from "@/modules/admin/lib/admin-can";
import { CreateAdministratorModal } from "@/modules/administrators/components/create-administrator-modal";
import { AdministratorsList } from "@/modules/administrators/components/administrators-list";
import { AdministratorsListSkeleton } from "@/modules/administrators/components/administrators-list-skeleton";

export const metadata: Metadata = {
  title: "Administrators",
  robots: { index: false, follow: false },
};

// Reads the searchParams promise itself — kept out of the page component so
// awaiting it doesn't force the whole page (including the static PageHeader
// below) behind the route's loading.tsx boundary. Only this Suspense-wrapped
// piece should wait on it.
async function AdministratorsListForParams({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; is_active?: string; role?: string; page?: string }>;
}) {
  const { q = "", is_active = "", role = "", page = "1" } = await searchParams;
  return <AdministratorsList q={q} isActive={is_active} role={role} page={page} />;
}

export default function AdministratorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; is_active?: string; role?: string; page?: string }>;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrators"
        description="Manage administrator accounts, roles and access."
        action={
          <Can permission={PERMISSIONS.administratorsManage}>
            <CreateAdministratorModal />
          </Can>
        }
      />
      <Suspense fallback={<AdministratorsListSkeleton />}>
        <AdministratorsListForParams searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
