import Link from "next/link";
import { AlertTriangle, Lock, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { adminCan, PERMISSIONS } from "@/modules/admin/lib/admin-can";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GatewayLogsFeed } from "@/modules/gateway-logs/components/gateway-logs-feed";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { LogDateRangeFilter } from "@/components/ui/log-date-range-filter";
import { ClearLogFiltersButton } from "@/components/ui/clear-log-filters-button";
import { LogFilterInput } from "@/modules/admin-logs/components/log-filter-input";
import { LogFilterSelect } from "@/modules/admin-logs/components/log-filter-select";
import {
  ADMIN_LOGS_PER_PAGE,
  buildAdminLogQuery,
  isValidLogDate,
} from "@/modules/admin-logs/lib/build-admin-log-query";
import type { AdminUser } from "@/types/admin-user";
import type { ApiCatalogListItem } from "@/types/api-catalog";
import type { GatewayLogListItem } from "@/types/gateway-log";
import type { Paginated } from "@/types/pagination";

// A catalog's identifier IS its gateway platform slug (the backend resolves
// the partner config by that same key), so the catalog list doubles as the
// platform filter's options. Best-effort, and skipped entirely without the
// permission — gateway-logs-view doesn't imply api-catalogs-view, and every
// non-2xx from apiFetch is reported as an error, so an entirely predictable
// 403 shouldn't be provoked just to populate a filter.
async function getPlatformOptions(): Promise<string[]> {
  if (!(await adminCan(PERMISSIONS.apiCatalogsView))) return [];
  try {
    const { data } = await apiFetch<{ data: ApiCatalogListItem[] }>(
      // The catalog list is paginated (20 by default) — the filter needs
      // every partner, so it asks for the endpoint's maximum page size.
      "/api-catalogs?order_by=identifier&sort_by=asc&per_page=100",
      { next: { tags: ["api-catalogs"] } },
      "admin",
    );
    return data.map((catalog) => catalog.identifier);
  } catch {
    return [];
  }
}

// Names the citizen a scoped list belongs to. Same treatment — the logs
// endpoints are gated on gateway-logs-view alone, so an admin can
// legitimately reach this list without users-view, and the list falls back
// to showing the uuid.
async function getScopedUserName(uuid: string): Promise<string | null> {
  if (!(await adminCan(PERMISSIONS.usersView))) return null;
  try {
    const { data } = await apiFetch<{ data: AdminUser }>(
      `/users/${uuid}`,
      { next: { tags: [`users:${uuid}`] } },
      "admin",
    );
    return data.display_name;
  } catch {
    return null;
  }
}

export async function AdminGatewayLogsList({
  platform,
  statusCode,
  from,
  to,
  page,
  userUuid,
}: {
  platform: string;
  // Exact-match HTTP status returned to the caller, free text ("200", "502").
  statusCode: string;
  // Inclusive YYYY-MM-DD bounds, either or both open. These replaced the old
  // month picker: the admin lists read from OpenSearch and are no longer
  // month-scoped, so a range can span months (2026-08-15 handoff §3).
  from: string;
  to: string;
  page: string;
  // When set, reads that citizen's logs instead of everyone's.
  userUuid?: string;
}) {
  await requireAdminSession();

  const query = buildAdminLogQuery({
    filters: { platform, status_code: statusCode },
    from,
    to,
    page,
  });
  const path = userUuid ? `/users/${userUuid}/gateway-logs` : "/gateway-logs";

  // Caught here rather than left to throw into error.tsx — a Suspense-wrapped
  // Server Component's thrown error doesn't reliably reach the nearest error
  // boundary in this app (see UsersList for the same pattern).
  let response: Paginated<GatewayLogListItem>;
  try {
    response = await apiFetch<Paginated<GatewayLogListItem>>(
      `${path}?${query}`,
      { cache: "no-store" },
      "admin",
    );
  } catch (err) {
    // The API is the real boundary: an admin whose role lacks
    // gateway-logs-view gets a 403 here even if the nav link was rendered.
    if (isApiError(err) && err.status === 403) {
      return (
        <EmptyState
          icon={Lock}
          title="You don't have access to gateway logs"
          description="Ask an administrator to grant your role the gateway-logs-view permission, then sign in again."
        />
      );
    }
    const message = isApiError(err) ? err.message : "Something went wrong loading gateway logs.";
    return (
      <EmptyState icon={AlertTriangle} title="Couldn't load gateway logs" description={message} />
    );
  }

  const [platformOptions, scopedUserName] = await Promise.all([
    getPlatformOptions(),
    userUuid ? getScopedUserName(userUuid) : Promise.resolve(null),
  ]);

  const logs = response.data;
  // An empty-but-valid paginator can arrive without meta at all — fall back to
  // a shape the paginator can render rather than crashing on it.
  const meta = response.meta ?? {
    current_page: Number(page) || 1,
    last_page: 1,
    per_page: ADMIN_LOGS_PER_PAGE,
    total: logs.length,
    from: logs.length ? 1 : null,
    to: logs.length || null,
  };

  // Broadcasts are always "now", so they only belong in a list whose range
  // still includes today — appending a live row while reading a range that
  // ended last week would put a row on screen the query behind it excludes.
  // Only the `to` bound can exclude now; `from` can't, since the picker won't
  // let a range start in the future. Both sides are YYYY-MM-DD, so the plain
  // string compare is a date compare. Resolved here rather than in the client
  // component because the browser's clock isn't the authority on "today".
  const isLive = !isValidLogDate(to) || to >= format(new Date(), "yyyy-MM-dd");

  return (
    <section aria-label="Gateway logs" className="space-y-4">
      {userUuid && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <span className="text-sm text-muted-foreground">Showing calls made by</span>
          <Badge variant="secondary">{scopedUserName ?? userUuid}</Badge>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto gap-1.5"
            nativeButton={false}
            render={<Link href="/admin/gateway-logs" />}
          >
            <X aria-hidden className="size-3.5" />
            Show all users
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <LogDateRangeFilter from={from} to={to} />
        {platformOptions.length > 0 && (
          <LogFilterSelect
            param="platform"
            label="Filter by platform"
            value={platform}
            allLabel="All platforms"
            options={platformOptions.map((slug) => ({ value: slug, label: slug }))}
          />
        )}
        <LogFilterInput
          param="status_code"
          label="Filter by status code"
          value={statusCode}
          placeholder="Status code"
          className="sm:w-32"
        />
        <ClearLogFiltersButton keep={["user"]} />
      </div>
      {/* Live tail on the shared admin feed. There is one admin channel by
          design — the per-user screen is a client-side filter on the event's
          user_uuid, not a second subscription. */}
      <GatewayLogsFeed
        logs={logs}
        audience="admin"
        userUuid={userUuid}
        channel="administrators"
        platform={platform}
        append={isLive && meta.current_page === 1}
        enabled={isLive}
        initialTotal={meta.total}
        emptyTitle="No gateway calls match these filters"
        emptyDescription="Widen the date range or clear the platform filter. The range is inclusive on both ends and can span months."
      />
      {/* Reflects the REST page, so it follows the server rows, not the live
          ones — an empty month has nothing to page through. */}
      {logs.length > 0 && <PaginationBar meta={meta} />}
    </section>
  );
}
