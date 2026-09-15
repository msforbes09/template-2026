import { AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { requireClientSession } from "@/lib/auth/dal";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { canCreateProjects } from "@/modules/client-auth/lib/account";
import { DeveloperOnlyNotice } from "@/modules/client-auth/components/developer-only-notice";
import { isValidLogDate } from "@/lib/log-date";
import { EmptyState } from "@/components/ui/empty-state";
import { GatewayLogsFeed } from "@/modules/gateway-logs/components/gateway-logs-feed";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { GatewayLogsToolbar } from "@/modules/gateway-logs/components/gateway-logs-toolbar";
import {
  buildGatewayLogQuery,
  GATEWAY_LOGS_PER_PAGE,
} from "@/modules/gateway-logs/lib/build-log-query";
import type { GatewayLogListItem } from "@/types/gateway-log";
import type { Paginated } from "@/types/pagination";
import type { UserApiCatalogListItem } from "@/types/user-api-catalog";

// A catalog's identifier is its gateway platform slug, so the citizen's own
// catalog list supplies the platform filter. The catalog endpoints require an
// approved account while the logs themselves don't, so an unapproved citizen
// simply gets no platform filter — asked for outright it would be a
// guaranteed 403, and apiFetch reports every non-2xx as an error.
async function getPlatformOptions(status: string | null | undefined): Promise<string[]> {
  if (status !== "approved") return [];
  try {
    const { data } = await apiFetch<{ data: UserApiCatalogListItem[] }>(
      // Paginated (20 by default) — the filter wants every catalog, so it
      // asks for the endpoint's maximum page size.
      "/api-catalogs?order_by=identifier&sort_by=asc&per_page=100",
      { next: { tags: ["api-catalogs"] } },
      "client",
    );
    return data.map((catalog) => catalog.identifier);
  } catch {
    return [];
  }
}

export async function ClientGatewayLogsList({
  platform,
  statusCode,
  from,
  to,
  page,
}: {
  platform: string;
  statusCode: string;
  from: string;
  to: string;
  page: string;
}) {
  await requireClientSession();

  // Gating on the account, not on the response. GET user/gateway-logs is open
  // to any citizen and simply returns an empty list for one without
  // credentials, so an ungated page would tell a basic account "No API calls
  // yet" — implying it could make some. The uuid and status read off the same
  // profile further down; getClientProfile is cache()-memoized per request, so
  // fetching it before the list costs nothing.
  const profile = await getClientProfile();
  if (profile && !canCreateProjects(profile)) {
    return <DeveloperOnlyNotice profile={profile} what="The usage log" />;
  }

  const query = buildGatewayLogQuery({ platform, statusCode, from, to, page });

  // Caught here rather than left to throw into error.tsx — a Suspense-wrapped
  // Server Component's thrown error doesn't reliably reach the nearest error
  // boundary in this app.
  let response: Paginated<GatewayLogListItem>;
  try {
    response = await apiFetch<Paginated<GatewayLogListItem>>(
      `/gateway-logs?${query}`,
      { cache: "no-store" },
      "client",
    );
  } catch (err) {
    const message = isApiError(err) ? err.message : "Something went wrong loading your API usage.";
    return <EmptyState icon={AlertTriangle} title="Couldn't load your usage" description={message} />;
  }

  // The uuid names this citizen's private broadcast channel
  // (`private-user.{uuid}`), and the status gates the platform filter.
  const platformOptions = await getPlatformOptions(profile?.status);

  const logs = response.data;
  const meta = response.meta ?? {
    current_page: Number(page) || 1,
    last_page: 1,
    per_page: GATEWAY_LOGS_PER_PAGE,
    total: logs.length,
    from: logs.length ? 1 : null,
    to: logs.length || null,
  };

  // Live rows are always "now", so they only belong in a range that includes
  // today — a citizen reading last week's calls shouldn't have new ones append
  // underneath. Compared as strings, which is safe for YYYY-MM-DD. Today is the
  // server's, so the boundary can be a few hours out from the browser's in a
  // different timezone; the cost is a feed that stays inert for the tail of the
  // last day of a range, which is why it's a comparison and not an assertion.
  // Without a uuid there's no channel to name, so the feed stays inert rather
  // than guessing one.
  const today = new Date().toISOString().slice(0, 10);
  const rangeIncludesToday =
    (!isValidLogDate(to) || to >= today) && (!isValidLogDate(from) || from <= today);
  const isLive = rangeIncludesToday && !!profile?.uuid;

  const hasRange = isValidLogDate(from) || isValidLogDate(to);

  return (
    <section aria-label="Gateway usage" className="space-y-4">
      <GatewayLogsToolbar
        from={from}
        to={to}
        platform={platform}
        platformOptions={platformOptions}
        statusCode={statusCode}
      />
      {/* The citizen's own private channel — ownership-enforced server-side,
          so this only ever carries their own calls. */}
      <GatewayLogsFeed
        logs={logs}
        audience="client"
        channel={`user.${profile?.uuid ?? ""}`}
        platform={platform}
        append={isLive && meta.current_page === 1}
        enabled={isLive}
        initialTotal={meta.total}
        emptyTitle={hasRange ? "No API calls in this date range" : "No API calls yet"}
        emptyDescription={
          hasRange
            ? "Nothing was recorded between those dates. Widen the range, or clear it to see everything."
            : "Calls you make against the eGov API gateway with your credentials show up here."
        }
      />
      {logs.length > 0 && <PaginationBar meta={meta} />}
    </section>
  );
}
