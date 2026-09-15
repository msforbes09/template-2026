import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { RatingSummary } from "@/modules/reviews/components/star-rating";
import { cn } from "@/lib/utils";
import { getCatalogLogo, metaString } from "@/lib/catalog-meta";
import type { PublicApiCatalogItem } from "@/types/public-api-catalog";

// One published API catalog, as a card. Shared by the two public surfaces that
// list the catalog: the landing page's carousel (#catalog) and the dedicated
// /api-catalogs index. It lived inside service-cards.tsx until the index page
// existed and needed the identical card — a second copy would have drifted the
// way the hand-written service list did before it.
//
// Copy comes from the catalog record: `name`, `description`, and `meta.title`
// (a short category label like "Single sign-on", set alongside meta.icon for
// every live entry).

// The brand lockup, in order of preference:
//   1. A curated local wordmark (getCatalogLogo) — pre-trimmed, right weight
//      for this section, and the same asset the catalog's doc page header uses.
//   2. The catalog's own uploaded logo (meta.logo_url) — how a catalog added
//      later gets its real mark here with no code change. Same treatment the
//      signed-in catalog list already gives it (DashboardApiCatalog).
//   3. Its lucide icon + the name, for a catalog with neither.
// A wordmark already carries the name, so the text heading only appears in the
// cases where nothing else states it.
//
// `Icon` arrives as a prop rather than being looked up here: resolveMetaIcon
// returns a component, and calling it inside a component body trips the React
// Compiler's "cannot create components during render". It's resolved in the
// list's map callback instead — the same place DashboardApiCatalog does it.
function CatalogLockup({
  catalog,
  name,
  Icon,
}: {
  catalog: PublicApiCatalogItem;
  name: string;
  Icon: LucideIcon;
}) {
  const logo = getCatalogLogo(catalog.identifier);
  const logoUrl = metaString(catalog.meta, "logo_url");

  if (logo?.mark) {
    // A square emblem (e.g. the DBM seal for Compass) can't identify the
    // service on its own, so it sits beside the name rather than replacing it.
    return (
      <>
        <Image
          src={logo.src}
          alt=""
          width={logo.w}
          height={logo.h}
          className="h-8 w-8 shrink-0 object-contain"
        />
        <span className="text-lg font-semibold tracking-tight text-foreground">{name}</span>
      </>
    );
  }

  if (logo) {
    return (
      <Image
        src={logo.src}
        alt={name}
        width={logo.w}
        height={logo.h}
        className="h-7 w-auto object-contain"
      />
    );
  }

  if (logoUrl) {
    // No fixed height, unlike the curated marks above: an uploaded logo's shape
    // is unknown (the live Face Liveness one is a two-line wordmark), so it is
    // fitted inside a box instead — a stacked mark at the single-line height
    // would render its text at half the size of every other card's.
    return (
      // eslint-disable-next-line @next/next/no-img-element -- admin-entered external logo URL, not configured for next/image
      <img src={logoUrl} alt={name} className="max-h-9 w-auto max-w-44 object-contain" />
    );
  }

  return (
    <>
      <span
        aria-hidden
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10"
      >
        <Icon className="size-5 text-primary" />
      </span>
      <span className="text-lg font-semibold tracking-tight text-foreground">{name}</span>
    </>
  );
}

export function PublicCatalogCard({
  catalog,
  Icon,
  basePath,
}: {
  catalog: PublicApiCatalogItem;
  Icon: LucideIcon;
  // Where this card points. The signed-in developer's twin of the public page
  // is the better destination for them — it carries their credential, the
  // Test tab and their usage — so an approved developer is sent straight
  // there instead of to the read-only anonymous view. See
  // resolveCatalogBasePath.
  basePath: string;
}) {
  const name = catalog.name ?? catalog.identifier;
  const category = metaString(catalog.meta, "title");

  return (
    <Link
      href={`${basePath}/${catalog.identifier}`}
      aria-label={`${name} — view API documentation`}
      // The hover lift used to come from <StaggerItem lift>, which the carousel
      // can't use: its whileInView reveal never fires for a slide that starts
      // outside the viewport horizontally, so those cards would stay invisible.
      // Owning the lift here keeps it identical on the carousel and the grid.
      className="group flex h-full flex-col rounded-[22px] border border-border bg-card/80 p-7 shadow-[0_12px_34px_rgba(15,23,42,0.035)] backdrop-blur transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(15,23,42,0.07)] motion-reduce:hover:translate-y-0 sm:p-8"
    >
      <div className="flex h-12 items-center gap-3">
        <CatalogLockup catalog={catalog} name={name} Icon={Icon} />
      </div>

      {category && <p className="mt-6 text-sm font-medium text-muted-foreground">{category}</p>}
      {catalog.description && (
        // Descriptions are maintained in admin and vary in length; the clamp
        // keeps a long one from stretching its row taller than the rest.
        <p
          className={cn(
            "line-clamp-4 max-w-[46ch] text-sm leading-6 text-muted-foreground/90",
            category ? "mt-2" : "mt-6",
          )}
        >
          {catalog.description}
        </p>
      )}
      {/* Renders nothing until this API has been reviewed — an unreviewed
          card must not show an empty star row, and the fallback catalogs used
          when the API is unreachable carry no ratings at all. */}
      <RatingSummary subject={catalog} size="sm" className="mt-4" />
      {/* The card is a real destination, not an in-page anchor — say so, so the
          affordance isn't left to the cursor alone. Pushed to the bottom so it
          lines up across cards of differing blurb lengths. */}
      <span className="mt-auto flex items-center gap-1.5 pt-6 text-sm font-medium text-primary">
        View documentation
        <ArrowUpRight
          aria-hidden
          className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </span>
    </Link>
  );
}

// The card's footprint, for the Suspense fallbacks on both surfaces. Kept next
// to the card so the two move together — a skeleton of the wrong height is a
// layout shift on the portal's busiest page.
export const PUBLIC_CATALOG_CARD_HEIGHT = "h-[19rem]";

export function PublicCatalogCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[22px] border border-border bg-card/60",
        PUBLIC_CATALOG_CARD_HEIGHT,
        className,
      )}
    />
  );
}
