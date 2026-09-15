import { CatalogDocSkeleton } from "@/modules/api-docs/components/catalog-doc-skeleton";

export default function PublicApiCatalogLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      {/* Back link placeholder — same offset as the real one */}
      <div aria-hidden className="mb-8 h-7 w-28 animate-pulse rounded-md bg-muted/60" />
      <CatalogDocSkeleton />
    </div>
  );
}
