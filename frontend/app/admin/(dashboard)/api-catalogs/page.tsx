import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ApiCatalogsList } from "@/modules/api-catalog/components/api-catalogs-list";
import { ApiCatalogsListSkeleton } from "@/modules/api-catalog/components/api-catalogs-list-skeleton";

export const metadata: Metadata = {
  title: "API catalog",
  robots: { index: false, follow: false },
};

// Reads the searchParams promise itself — kept out of the page component so
// awaiting it doesn't force the whole page (including the static PageHeader
// below) behind the route's loading.tsx boundary. Only this Suspense-wrapped
// piece should wait on it (see searchparams_ppr_boundary memory).
async function ApiCatalogsListForParams({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; is_active?: string; page?: string }>;
}) {
  const { q = "", is_active = "", page = "1" } = await searchParams;
  return <ApiCatalogsList q={q} isActive={is_active} page={page} />;
}

export default function ApiCatalogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; is_active?: string; page?: string }>;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="API catalog"
        description="Manage the documentation shown for each published API. Entries are created by the backend."
      />
      <Suspense fallback={<ApiCatalogsListSkeleton />}>
        <ApiCatalogsListForParams searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
