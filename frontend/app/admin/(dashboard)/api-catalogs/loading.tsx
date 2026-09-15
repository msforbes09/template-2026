import { ApiCatalogsListSkeleton } from "@/modules/api-catalog/components/api-catalogs-list-skeleton";

export default function ApiCatalogsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <ApiCatalogsListSkeleton />
    </div>
  );
}
