import { AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { requireClientSession } from "@/lib/auth/dal";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { isValidLogDate } from "@/lib/log-date";
import { EmptyState } from "@/components/ui/empty-state";
import { GatewayLogsFeed } from "@/modules/gateway-logs/components/gateway-logs-feed";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { GatewayLogsToolbar } from "@/modules/gateway-logs/components/gateway-logs-toolbar";
import { CatalogCreditsPanel } from "@/modules/gateway-quota/components/catalog-credits";
import { ClientLiveUsage } from "@/modules/gateway-usage/components/client-live-usage";
import { findPool } from "@/modules/gateway-quota/lib/credits";
import {
  buildGatewayLogQuery,
  GATEWAY_LOGS_PER_PAGE,
} from "@/modules/gateway-logs/lib/build-log-query";
import type { GatewayLogListItem } from "@/types/gateway-log";
import type { Paginated } from "@/types/pagination";

// The citizen's own gateway usage for ONE catalog — the Usage tab on
// /dashboard/api-catalogs/[identifier].
//
// Same User API endpoint as the account-wide list (ClientGatewayLogsList), only
// with the platform pinned instead of chosen: a catalog's `identifier` IS its
// gateway platform slug, which is exactly what `?platform=` matches on. So
// there's no platform select here and no `platform` URL param — the route
// already says which API this is, and letting the URL override it would mean
// the tab could show calls to a different API than the page it sits on.
//
// The date range lives in the URL (?from=&to=). It used to be ?month=YYYY-MM,
// which this endpoint no longer accepts — it moved onto OpenSearch with the
// 2026-08-17 handoff, the same footing the admin lists were already on. Row ids
// stay composite and carry their own month into the show call.
export async function CatalogGatewayLogsList({
  identifier,
  title,
  statusCode,
  from,
  to,
  page,
}: {
  identifier: string;
  // The catalog's display name, for the copy. Falls back to the identifier
  // upstream when the catalog has no name.
  title: string;
  statusCode: string;
  from: string;
  to: string;
  page: string;
}) {
  await requireClientSession();

  const query = buildGatewayLogQuery({ platform: identifier, statusCode, from, to, page });

  // Caught here rather than left to throw into error.tsx — a Suspense-wrapped
  // Server Component's thrown error doesn't reliably reach the nearest error
  // boundary in this app (see ClientGatewayLogsList for the same pattern).
  let response: Paginated<GatewayLogListItem>;
  try {
    response = await apiFetch<Paginated<GatewayLogListItem>>(
      `/gateway-logs?${query}`,
      { cache: "no-store" },
      "client",
    );
  } catch (err) {
    const message = isApiError(err)
      ? err.message
      : "Something went wrong loading your usage for this API.";
    return <EmptyState icon={AlertTriangle} title="Couldn't load your usage" description={message} />;
  }

  // The uuid names this citizen's private broadcast channel
  // (`private-user.{uuid}`); without one there's no channel to subscribe to.
  const profile = await getClientProfile();

  // This catalog's own credit pool, off the same profile read — no extra
  // request. A catalog's `identifier` IS its gateway platform slug, which is
  // what the pool is keyed on (the same equivalence the platform filter above
  // relies on). Null for a basic account, where the API omits `credits`
  // entirely, and for a partner with no pool yet — both render nothing rather
  // than an empty meter that would read as a zero allowance.
  const pool = findPool(profile?.credits, identifier);

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
  // today, and only on the newest page, where prepending them doesn't
  // misrepresent what's on screen. Decided server-side; see the same note in
  // ClientGatewayLogsList for the timezone caveat.
  const today = new Date().toISOString().slice(0, 10);
  const rangeIncludesToday =
    (!isValidLogDate(to) || to >= today) && (!isValidLogDate(from) || from <= today);
  const isLive = rangeIncludesToday && !!profile?.uuid;

  const hasRange = isValidLogDate(from) || isValidLogDate(to);

  return (
    <section aria-labelledby="catalog-usage-heading" className="space-y-4">
      <div>
        <h2 id="catalog-usage-heading" className="text-sm font-semibold tracking-tight">
          Your calls to this API
        </h2>
        <p className="mt-1 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
          Every request you make to {title} with your credentials, newest first.
        </p>
      </div>
      {/* Above the filters: the allowance decides whether the next call on this
          page succeeds at all, so it outranks the log it sits over. */}
      {pool && <CatalogCreditsPanel pool={pool} title={title} />}
      {/* Pinned to THIS catalog — the citizen's channel carries every API they
          call, so without the platform scope this would plot traffic from
          services the page is not about. */}
      <ClientLiveUsage platform={identifier} height="h-40 sm:h-48" />
      {/* Date range + status only — the platform is the catalog this page is about. */}
      <GatewayLogsToolbar from={from} to={to} statusCode={statusCode} scroll={false} />
      {/* The citizen's own private channel — ownership is enforced
          server-side, so this only ever carries their own calls, and the
          platform filter keeps it to this catalog's. */}
      <GatewayLogsFeed
        logs={logs}
        audience="client"
        channel={`user.${profile?.uuid ?? ""}`}
        platform={identifier}
        platformFilterable={false}
        append={isLive && meta.current_page === 1}
        enabled={isLive}
        initialTotal={meta.total}
        emptyTitle={hasRange ? "No calls to this API in this date range" : "No calls to this API yet"}
        emptyDescription={
          hasRange
            ? "Nothing was recorded between those dates. Widen the range, or clear it to see everything."
            : "Requests you send to this API with your credentials show up here as they happen."
        }
      />
      {logs.length > 0 && <PaginationBar meta={meta} scroll={false} />}
    </section>
  );
}
