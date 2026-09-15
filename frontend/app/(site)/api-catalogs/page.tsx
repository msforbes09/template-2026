import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PublicCatalogGrid,
  PublicCatalogGridSkeleton,
} from "@/modules/api-catalog/components/public-catalog-grid";
import { PublicApiCatalogsJsonLd } from "@/modules/site/components/public-api-catalogs-json-ld";
import { loadPublicCatalogs } from "@/modules/api-catalog/lib/public-catalog-list";
import { Reveal } from "@/components/ui/reveal";

// The dedicated catalog index — every published API in one place. The landing
// page shows the same cards in a carousel and links here for the full list.
//
// Deliberately at the landing page's container width and padding rather than
// the narrower max-w-7xl the detail pages use, so a card is the same size on
// both sides of that link.

const TITLE = "API catalog";
const DESCRIPTION =
  "Every API published on the eGov Developer Portal — identity, sign-in, messaging, payments, AI and more. Read the full specification and integration guide for any of them without an account; generate a credential once your developer access is approved.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/api-catalogs" },
  openGraph: { type: "website", url: "/api-catalogs", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default async function ApiCatalogsPage() {
  // Cached ("use cache", tagged "api-catalogs"), so this is NOT request-time
  // data and can be awaited at the page root: the heading, the count and the
  // JSON-LD are all part of the prerendered shell. Only the grid's card
  // destinations depend on the visitor, and those sit in <Suspense> below.
  const catalogs = await loadPublicCatalogs();

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-12 sm:px-9 lg:px-16 lg:py-16">
      <PublicApiCatalogsJsonLd catalogs={catalogs} />

      <Reveal>
        <header className="max-w-[52rem]">
          <div className="mb-5 inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.04em] text-primary">
            {TITLE}
          </div>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
            {catalogs.length} government{" "}
            {catalogs.length === 1 ? "service" : "services"},{" "}
            <span className="text-primary">one gateway.</span>
          </h1>
          <p className="mt-7 text-base leading-7 text-muted-foreground sm:text-lg">
            {DESCRIPTION}
          </p>
        </header>
      </Reveal>

      <div className="mt-12 lg:mt-16">
        <Suspense fallback={<PublicCatalogGridSkeleton count={catalogs.length} />}>
          <PublicCatalogGrid />
        </Suspense>
      </div>
    </div>
  );
}
