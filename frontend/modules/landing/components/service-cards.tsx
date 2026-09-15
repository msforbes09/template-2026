import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CarouselItem } from "@/components/ui/carousel";
import { resolveMetaIcon } from "@/lib/catalog-meta";
import { CatalogCarousel } from "@/modules/landing/components/catalog-carousel";
import {
  PublicCatalogCard,
  PublicCatalogCardSkeleton,
} from "@/modules/api-catalog/components/public-catalog-card";
import {
  FALLBACK_CATALOGS,
  loadPublicCatalogs,
  resolveCatalogBasePath,
} from "@/modules/api-catalog/lib/public-catalog-list";

// Catalog carousel (#catalog): every published API catalog, one card each,
// linking to its public detail page — and a way through to /api-catalogs,
// which lists the same catalogs in full.
//
// This was a bento grid of all nine catalogs, which is a lot of page to hand
// someone directly under the hero. A rail shows the same cards at the same
// size, gives the section a fixed height whatever the catalog grows to, and
// puts "Browse all APIs" where somebody who wants the whole list can take it.
// The full grid did not disappear — it is what the /api-catalogs page renders.
//
// The list itself comes from the Common API (see loadPublicCatalogs), so
// publishing a catalog in admin is what puts it here; it used to be a
// hand-written array that drifted two services behind.
//
// The section is NOT part of the static shell: each card's destination depends
// on whether the visitor is an approved developer, so it streams behind a
// Suspense boundary on the landing page. The catalog read is cached, and an
// anonymous visitor never triggers a profile fetch, so the hole resolves
// immediately for nearly all traffic.

// Four across at the widest, down to one on a phone — but deliberately NOT a
// whole number of cards at any breakpoint. basis-1/4 tiles exactly four into
// the container and the rail then looks like a static row; a few percent
// narrower leaves the next card clipped at the edge, which is what says it
// scrolls. That sliver does the job a dot row would, without the markup.
const SLIDE_BASIS = "basis-[86%] sm:basis-[48%] lg:basis-[32%] xl:basis-[24%]";

const SECTION_CLASS = "scroll-mt-24 bg-background";
const CONTAINER_CLASS = "mx-auto w-full max-w-[1600px] px-6 pb-20 pt-6 sm:px-9 lg:px-16";

function SectionHeading() {
  return (
    <div>
      <div className="mb-5 inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.04em] text-primary">
        API catalog
      </div>
      <h2 className="max-w-[560px] text-3xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-4xl">
        Every government service, <span className="text-primary">one gateway.</span>
      </h2>
    </div>
  );
}

export async function ServiceCards() {
  const catalogs = await loadPublicCatalogs();
  const basePath = await resolveCatalogBasePath();

  return (
    <section id="catalog" className={SECTION_CLASS}>
      <div className={CONTAINER_CLASS}>
        <CatalogCarousel
          header={<SectionHeading />}
          action={
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/api-catalogs" />}
              className="rounded-full"
            >
              Browse all APIs
              <ArrowRight data-icon="inline-end" />
            </Button>
          }
        >
          {catalogs.map((catalog) => {
            // Resolved here rather than inside the card: resolveMetaIcon
            // returns a component, and calling it in a component body trips
            // the React Compiler's "cannot create components during render".
            const Icon = resolveMetaIcon(catalog.meta);
            return (
              <CarouselItem key={catalog.identifier} className={SLIDE_BASIS}>
                <PublicCatalogCard catalog={catalog} Icon={Icon} basePath={basePath} />
              </CarouselItem>
            );
          })}
        </CatalogCarousel>
      </div>
    </section>
  );
}

// Mirrors the real section: same padding, same header block, same rail with the
// same slide widths and card height, so the hole it fills doesn't shift when it
// resolves. The rail is a plain clipped flex row — no embla, nothing to
// hydrate — and the count follows the fallback list rather than a literal, so
// it can't go stale the way a hard-coded "seven" did once the catalog grew.
export function ServiceCardsSkeleton() {
  return (
    <section id="catalog" aria-hidden className={SECTION_CLASS}>
      <div className={CONTAINER_CLASS}>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
          <SectionHeading />
          <div className="flex shrink-0 items-center gap-3">
            <div className="h-9 w-40 animate-pulse rounded-full bg-muted/60" />
            <div className="flex items-center gap-2">
              <div className="size-8 animate-pulse rounded-full bg-muted/60" />
              <div className="size-8 animate-pulse rounded-full bg-muted/60" />
            </div>
          </div>
        </div>
        <div className="mt-10 overflow-hidden">
          <div className="-ml-4 flex">
            {FALLBACK_CATALOGS.map((catalog) => (
              <div
                key={catalog.identifier}
                className={`min-w-0 shrink-0 grow-0 pl-4 ${SLIDE_BASIS}`}
              >
                <PublicCatalogCardSkeleton />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
