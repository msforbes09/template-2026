import { AlertTriangle, LayoutGrid, Lock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { requireClientSession } from "@/lib/auth/dal";
import { DashboardApiCatalog } from "@/modules/site/components/dashboard-api-catalog";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { canCreateProjects } from "@/modules/client-auth/lib/account";
import { DeveloperOnlyNotice } from "@/modules/client-auth/components/developer-only-notice";
import type { UserApiCatalogListItem } from "@/types/user-api-catalog";

// The catalogue of services this account can integrate with. It used to sit on
// /dashboard, which pushed the citizen's own projects below the fold; the
// dashboard now leads with projects and links here.
//
// The credit allowance used to head this page too. It was the same per-catalog
// meters that /dashboard/usage already shows, next to the usage log they
// describe — two places to read one number, and this was the one without the
// calls beside it. Removed rather than kept in sync.
export async function DeveloperAccess() {
  await requireClientSession();
  const profile = await getClientProfile();

  // The catalog list below is developer-only: GET user/api-catalogs sits behind
  // the backend's `user.approved` middleware, so for anyone else it is a
  // guaranteed 403 rendered as "couldn't load the API catalog" — an error
  // where the real answer is "not yet".
  if (!profile || !canCreateProjects(profile)) {
    return profile ? (
      <DeveloperOnlyNotice profile={profile} what="API access" />
    ) : (
      <EmptyState
        icon={Lock}
        title="Couldn't load your account"
        description="Please try again in a moment."
      />
    );
  }

  // Caught here rather than left to throw into error.tsx — a Suspense-wrapped
  // Server Component's thrown error doesn't reliably reach the nearest error
  // boundary in this app.
  let catalogs: UserApiCatalogListItem[] = [];
  let catalogError: string | null = null;
  try {
    const response = await apiFetch<{ data: UserApiCatalogListItem[] }>(
      "/api-catalogs?order_by=id&sort_by=asc",
      { next: { tags: ["api-catalogs"] } },
      "client",
    );
    catalogs = response.data;
  } catch (err) {
    catalogError = isApiError(err)
      ? err.message
      : "Something went wrong loading the API catalog.";
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="api-catalog">
        {/* No "Usage log" button any more: this renders inside the API
            catalog TAB, and the Usage tab sits immediately beside it in the
            strip above. A link to a sibling tab would duplicate a control the
            reader can already see. */}
        <div>
          <h2 id="api-catalog" className="text-lg font-semibold tracking-tight">
            API <span className="text-primary">catalog</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate credentials and read the integration guide for each service.
          </p>
        </div>
        <div className="mt-4">
          {catalogError ? (
            <EmptyState
              icon={AlertTriangle}
              title="Couldn't load the API catalog"
              description={catalogError}
            />
          ) : catalogs.length === 0 ? (
            <EmptyState icon={LayoutGrid} title="No APIs available yet" description="Check back soon." />
          ) : (
            <DashboardApiCatalog catalogs={catalogs} />
          )}
        </div>
      </section>
    </div>
  );
}

// Mirrors the three-column catalogue grid.
export function DeveloperAccessSkeleton() {
  return (
    <div aria-hidden className="space-y-8">
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-52 animate-pulse rounded-xl bg-muted/50" />
          ))}
        </div>
      </div>
    </div>
  );
}
