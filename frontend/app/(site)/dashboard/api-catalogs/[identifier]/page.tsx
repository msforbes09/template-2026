import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { CatalogDocView } from "@/modules/api-docs/components/catalog-doc-view";
import {
  CatalogReviews,
  CatalogReviewsSkeleton,
} from "@/modules/api-catalog/components/catalog-reviews";
import { CatalogDocSkeleton } from "@/modules/api-docs/components/catalog-doc-skeleton";
import { ApiCatalogCredentialManager } from "@/modules/site/components/api-catalog-credential-manager";
import { CatalogGatewayLogsList } from "@/modules/gateway-logs/components/catalog-gateway-logs-list";
import { GatewayLogsSkeleton } from "@/modules/gateway-logs/components/gateway-logs-skeleton";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { requireClientSession } from "@/lib/auth/dal";
import type { UserApiCatalog } from "@/types/user-api-catalog";
import { safeErrorMessage } from "@/lib/safe-error-message";

export const metadata: Metadata = {
  title: "API documentation",
  robots: { index: false, follow: false },
};

// Only the date range/page of the Usage tab; the platform is the route's own
// identifier, never a URL param (see CatalogGatewayLogsList).
type CatalogSearchParams = Promise<{
  status_code?: string;
  from?: string;
  to?: string;
  page?: string;
}>;

// searchParams is awaited here, inside the Usage tab's own Suspense boundary,
// rather than in the page or the doc guard — awaiting it any higher would put
// the whole catalog page behind loading.tsx on every filter or page change.
async function CatalogUsageForParams({
  identifier,
  title,
  searchParams,
}: {
  identifier: string;
  title: string;
  searchParams: CatalogSearchParams;
}) {
  const { status_code: statusCode = "", from = "", to = "", page = "1" } = await searchParams;
  return (
    <CatalogGatewayLogsList
      identifier={identifier}
      title={title}
      statusCode={statusCode}
      from={from}
      to={to}
      page={page}
    />
  );
}

async function ApiCatalogDocGuard({
  identifier,
  searchParams,
}: {
  identifier: string;
  searchParams: CatalogSearchParams;
}) {
  await requireClientSession();

  // Caught here rather than left to throw into error.tsx — a Suspense-wrapped
  // Server Component's thrown error doesn't reliably reach the nearest error
  // boundary in this app (see AdministratorsList for the same pattern).
  let catalog: UserApiCatalog;
  try {
    const response = await apiFetch<{ data: UserApiCatalog }>(
      `/api-catalogs/${identifier}`,
      { next: { tags: ["api-catalogs"] } },
      "client",
    );
    catalog = response.data;
  } catch (err) {
    const message =
      isApiError(err) && err.status === 404
        ? "This API doesn't exist or you don't have access to it."
        : safeErrorMessage(err, "Something went wrong loading this API's documentation.");
    return <EmptyState title="Couldn't load this API" description={message} />;
  }

  return (
    <CatalogDocView
      identifier={catalog.identifier}
      name={catalog.name}
      description={catalog.description}
      body={catalog.body}
      spec={catalog.spec}
      meta={catalog.meta}
      // The spec's host is blank by design; the real gateway base URL rides
      // along with the credential (see modules/api-docs/lib/base-url.ts).
      baseUrl={catalog.credential?.public?.base_url ?? null}
      baseUrlNotice="This spec's base URL is blank until you generate a credential — open the Credentials tab to get yours."
      credentialsTab={
        <ApiCatalogCredentialManager
          identifier={catalog.identifier}
          credential={catalog.credential}
        />
      }
      // Its own boundary, so the logs stream in behind the documentation
      // instead of holding the whole page back — and so a filter change only
      // re-suspends this tab, leaving the tab selection intact.
      usageTab={
        <Suspense fallback={<GatewayLogsSkeleton rows={5} filters={1} credits />}>
          <CatalogUsageForParams
            identifier={catalog.identifier}
            title={catalog.name ?? catalog.identifier}
            searchParams={searchParams}
          />
        </Suspense>
      }
      // Inside the API documentation panel, so the thread only shows under the
      // tab it is about — it used to sit below the whole tab block and read as
      // a comment on Credentials or Usage.
      //
      // Keeps its own boundary, so it still streams rather than holding the
      // documentation back, and removes itself when the review kill switch is
      // off. The rating aggregates come from the public read inside
      // CatalogReviews, so the credential-bearing catalog payload isn't needed.
      //
      // Moving it in here does cost the parallelism it had as a page-level
      // sibling: it now starts after the catalog read above resolves rather
      // than alongside it. Unavoidable once it lives inside a panel that read
      // produces, and cheap — one API call, with the thread below the fold.
      documentationFooter={
        <Suspense fallback={<CatalogReviewsSkeleton />}>
          <CatalogReviews identifier={identifier} />
        </Suspense>
      }
    />
  );
}

export default async function ApiCatalogDocPage({
  params,
  searchParams,
}: {
  params: Promise<{ identifier: string }>;
  searchParams: CatalogSearchParams;
}) {
  const { identifier } = await params;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      {/* Back to where this page was opened FROM — the catalog grid on the
          Developers page, not the dashboard root. */}
      <Link
        href="/dashboard/developers"
        className="group -ml-1 mb-8 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft
          aria-hidden
          className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
        />
        Back to API catalog
      </Link>
      <Suspense fallback={<CatalogDocSkeleton />}>
        <ApiCatalogDocGuard identifier={identifier} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
