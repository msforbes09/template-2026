import { cn } from "@/lib/utils";
import { resolveMetaIcon } from "@/lib/catalog-meta";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { catalogSpans } from "@/modules/api-catalog/lib/catalog-grid";
import {
  PublicCatalogCard,
  PublicCatalogCardSkeleton,
} from "@/modules/api-catalog/components/public-catalog-card";
import {
  loadPublicCatalogs,
  resolveCatalogBasePath,
} from "@/modules/api-catalog/lib/public-catalog-list";

const GRID_CLASS = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-12";

// The full catalog, as a bento grid — the /api-catalogs index. This is the
// layout the landing page carried until it became a carousel; the rail shows
// the same cards but only a few at a time, and this is where "Browse all APIs"
// lands. Spans are computed from the real count so the grid ends flush whatever
// that count is (see catalog-grid.ts).
//
// Separate from the page shell because of resolveCatalogBasePath: it reads the
// session cookie to decide whether a card points at the public page or the
// developer's dashboard twin, which is request-time data and cannot be awaited
// at a page root under PPR.
export async function PublicCatalogGrid() {
  const catalogs = await loadPublicCatalogs();
  const basePath = await resolveCatalogBasePath();
  const spans = catalogSpans(catalogs.length);

  return (
    <Stagger className={GRID_CLASS} stagger={0.07}>
      {catalogs.map((catalog, index) => {
        // Resolved in the map callback, not inside the card: resolveMetaIcon
        // returns a component, and calling it in a component body trips the
        // React Compiler's "cannot create components during render".
        const Icon = resolveMetaIcon(catalog.meta);
        return (
          <StaggerItem key={catalog.identifier} className={cn("h-full", spans[index])}>
            <PublicCatalogCard catalog={catalog} Icon={Icon} basePath={basePath} />
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}

// `count` comes from the page, which already has the (cached) catalog list in
// hand for its JSON-LD — so the fallback lays out the exact number of cards
// that will replace it and the grid never reflows when the hole resolves.
export function PublicCatalogGridSkeleton({ count }: { count: number }) {
  const spans = catalogSpans(count);

  return (
    <div aria-hidden className={GRID_CLASS}>
      {spans.map((span, index) => (
        <PublicCatalogCardSkeleton key={index} className={span} />
      ))}
    </div>
  );
}
