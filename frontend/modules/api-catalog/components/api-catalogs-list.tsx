import { AlertTriangle, LayoutGrid } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { EmptyState } from "@/components/ui/empty-state";
import { adminCan, PERMISSIONS } from "@/modules/admin/lib/admin-can";
import { isFeatureEnabled } from "@/modules/feature-flags/lib/get-feature-flags";
import { ApiCatalogsToolbar } from "@/modules/api-catalog/components/api-catalogs-toolbar";
import { ApiCatalogsPagination } from "@/modules/api-catalog/components/api-catalogs-pagination";
import { ApiCatalogsTable } from "@/modules/api-catalog/components/api-catalogs-table";
import type { ApiCatalogListItem } from "@/types/api-catalog";

const PER_PAGE = 20;

export async function ApiCatalogsList({
  q,
  isActive,
  page,
}: {
  q: string;
  isActive: string;
  page: string;
}) {
  await requireAdminSession();

  const params = new URLSearchParams();
  if (q) params.set("search", q);
  if (isActive === "0" || isActive === "1") params.set("is_active", isActive);
  params.set("page", page);
  params.set("per_page", String(PER_PAGE));

  // Caught here rather than left to throw into error.tsx — see
  // nextjs16_suspense_error_boundary_bug memory: uncaught throws inside a
  // Suspense-wrapped Server Component never resolve to error.tsx in this app.
  let data: ApiCatalogListItem[];
  try {
    const response = await apiFetch<{ data: ApiCatalogListItem[] }>(
      `/api-catalogs?${params.toString()}`,
      { next: { tags: ["api-catalogs"] } },
      "admin",
    );
    data = response.data;
  } catch (err) {
    const message = isApiError(err)
      ? err.message
      : "Something went wrong loading the API catalog.";
    return (
      <section aria-label="API catalog list" className="space-y-4">
        <ApiCatalogsToolbar />
        <EmptyState icon={AlertTriangle} title="Couldn't load the API catalog" description={message} />
      </section>
    );
  }

  const currentPage = Number(page) || 1;
  const hasNextPage = data.length === PER_PAGE;

  return (
    <section aria-label="API catalog list" className="space-y-4">
      <ApiCatalogsToolbar />
      {data.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No API catalog entries found"
          description="Try a different search or filter. Entries are created by the backend."
        />
      ) : (
        <>
          <ApiCatalogsTable
            data={data}
            canViewDashboard={await adminCan(PERMISSIONS.dashboardView)}
            canManage={await adminCan(PERMISSIONS.apiCatalogsManage)}
            showRating={await isFeatureEnabled("api_catalog_reviews")}
          />
          <ApiCatalogsPagination currentPage={currentPage} hasNextPage={hasNextPage} />
        </>
      )}
    </section>
  );
}
