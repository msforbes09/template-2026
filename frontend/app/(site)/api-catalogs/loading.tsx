import { PublicCatalogGridSkeleton } from "@/modules/api-catalog/components/public-catalog-grid";
import { FALLBACK_CATALOGS } from "@/modules/api-catalog/lib/public-catalog-list";

// Matches the page's container, header block and grid. The card count follows
// the fallback list rather than a literal, so it tracks the real catalog
// instead of going stale the way a hard-coded number would.
export default function ApiCatalogsLoading() {
  return (
    <div
      aria-hidden
      className="mx-auto w-full max-w-[1600px] px-6 py-12 sm:px-9 lg:px-16 lg:py-16"
    >
      <div className="flex max-w-[52rem] flex-col gap-5">
        <div className="h-5 w-32 animate-pulse rounded bg-muted/60" />
        <div className="h-12 w-full max-w-xl animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted/60" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted/60" />
      </div>
      <div className="mt-12 lg:mt-16">
        <PublicCatalogGridSkeleton count={FALLBACK_CATALOGS.length} />
      </div>
    </div>
  );
}
