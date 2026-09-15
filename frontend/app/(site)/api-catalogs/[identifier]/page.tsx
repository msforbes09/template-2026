import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CatalogDocView } from "@/modules/api-docs/components/catalog-doc-view";
import {
  CatalogReviews,
  CatalogReviewsSkeleton,
} from "@/modules/api-catalog/components/catalog-reviews";
import { PublicApiCatalogJsonLd } from "@/modules/site/components/public-api-catalog-json-ld";
import { metaString } from "@/lib/catalog-meta";
import {
  getPublicApiCatalog,
  getPublicApiCatalogs,
} from "@/modules/site/lib/get-public-api-catalog";

// The anonymous view of one catalog: full spec and integration guide, no
// credential and no base URL. A developer can read everything here before
// signing up; they only learn where to send requests once they generate a
// credential (see the Credentials tab on the signed-in twin of this page).

// Every catalog is prerendered from the public list, so `params` isn't a
// runtime API here (see the Cache Components caching guide) and the whole
// page — metadata and JSON-LD included — is static output rather than a
// shell with a dynamic hole. An identifier outside this set still renders
// on demand; notFound() then serves not-found.tsx.
//
// That last case is a soft 404: the prerendered fallback shell flushes its
// 200 before the page body runs, so notFound() can't change the status.
// `dynamicParams = false` (the usual fix) is rejected outright by
// cacheComponents, so not-found.tsx carries `noindex, nofollow` instead —
// crawlers drop the URL either way, it just doesn't report as 404.
//
// getPublicApiCatalogs() swallows a failed read and returns [], which used to
// degrade to "no prerendered detail pages". Under cacheComponents an empty
// generateStaticParams is a hard build error instead (E898
// EmptyGenerateStaticParamsError) — Next needs at least one param to validate
// the route against runtime-only access. So when the list comes back empty,
// whether because the Common API was unreachable at build time or because no
// catalog is active yet, we hand it the placeholder the Cache Components docs
// prescribe and short-circuit it below.
const PLACEHOLDER_IDENTIFIER = "__placeholder__";

export async function generateStaticParams() {
  const catalogs = await getPublicApiCatalogs();
  if (catalogs.length === 0) return [{ identifier: PLACEHOLDER_IDENTIFIER }];
  return catalogs.map((catalog) => ({ identifier: catalog.identifier }));
}

// Falls back to the identifier and a generic blurb when the catalog omits a
// name/description — metadata still has to be unique per URL.
function seoText(
  catalog: { identifier: string; name: string | null; description: string | null },
  meta: Record<string, unknown> | null,
) {
  const title = catalog.name ?? catalog.identifier;
  const category = metaString(meta, "title");
  return {
    title,
    description:
      catalog.description ??
      `API documentation for ${title}${category ? ` — ${category}` : ""} on the eGov API Developer Portal.`,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ identifier: string }>;
}): Promise<Metadata> {
  const { identifier } = await params;
  // Never hit the API for the placeholder: when the list was empty because the
  // API itself was unreachable, getPublicApiCatalog would rethrow (only a 404
  // maps to null) and fail the build all over again.
  if (identifier === PLACEHOLDER_IDENTIFIER) {
    return { title: "API not found", robots: { index: false, follow: false } };
  }
  const catalog = await getPublicApiCatalog(identifier);
  if (!catalog) return { title: "API not found", robots: { index: false, follow: false } };

  const { title, description } = seoText(catalog, catalog.meta);
  const url = `/api-catalogs/${catalog.identifier}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title, description },
    twitter: { card: "summary", title, description },
  };
}

export default async function PublicApiCatalogPage({
  params,
}: {
  params: Promise<{ identifier: string }>;
}) {
  const { identifier } = await params;
  // See generateMetadata — the placeholder is served straight to not-found.tsx
  // without a lookup, so a build against an unreachable API still completes.
  if (identifier === PLACEHOLDER_IDENTIFIER) notFound();
  const catalog = await getPublicApiCatalog(identifier);
  if (!catalog) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <PublicApiCatalogJsonLd catalog={catalog} />
      <Link
        href="/api-catalogs"
        className="group -ml-1 mb-8 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft
          aria-hidden
          className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
        />
        All services
      </Link>
      <CatalogDocView
        identifier={catalog.identifier}
        name={catalog.name}
        description={catalog.description}
        body={catalog.body}
        spec={catalog.spec}
        meta={catalog.meta}
        kicker="API Reference"
        headingPriority
        // Read-only: the spec and its documentation, nothing that needs a
        // session. The Test tab, collection variables and extension widgets
        // all run server actions behind requireClientSession().
        interactive={false}
        // No credential exists for an anonymous visitor, so the spec's blank
        // base-URL variable stays blank — say why, rather than showing a
        // host-less URL and letting the Test tab fail silently.
        baseUrlNotice={
          <>
            This spec&apos;s base URL is blank on purpose. Sign in and generate a credential for
            this API to get yours — it&apos;s issued with your client ID and secret.{" "}
            <Link href="/dashboard" className="font-medium text-primary underline-offset-4 hover:underline">
              Go to your dashboard
            </Link>
            .
          </>
        }
        // Inside the API documentation panel rather than below the whole tab
        // block: the thread is about the documentation, and it used to sit
        // under the Integration tab too, where it read as a comment on that.
        //
        // Still its own boundary — reviews read cookies (whose review is
        // this?) and are not part of the prerendered shell, so they stream in
        // while the spec above stays static. The section removes itself
        // entirely when the review kill switch is off.
        documentationFooter={
          <Suspense fallback={<CatalogReviewsSkeleton />}>
            <CatalogReviews
              identifier={catalog.identifier}
              catalog={catalog}
              breakdown={catalog.rating_breakdown}
            />
          </Suspense>
        }
      />
    </div>
  );
}
