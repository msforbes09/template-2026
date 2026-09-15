import Link from "next/link";
import { AlertTriangle, BarChart3, CloudOff, Lock, ScrollText, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { PlatformBadge } from "@/modules/gateway-logs/components/platform-badge";
import { adminCan, PERMISSIONS } from "@/modules/admin/lib/admin-can";
import { getAdminUsageDashboard } from "@/modules/gateway-usage/lib/get-usage-dashboard";
import { windowCaption } from "@/modules/gateway-usage/lib/usage-metrics";
import {
  buildUsageQuery,
  INTERVAL_PRESET,
  platformFilterHref,
  usageQueryString,
} from "@/modules/gateway-usage/lib/usage-window";
import { UsageIntervalToggle } from "@/modules/gateway-usage/components/usage-interval-toggle";
import { UsageSeriesChart } from "@/modules/gateway-usage/components/usage-series-chart";
import { HealthVerdictLine } from "@/modules/gateway-usage/components/health-verdict-line";
import { LiveUsageChart } from "@/modules/gateway-usage/components/live-usage-chart";
import { LiveUsageCollapsible, LiveViewToggle } from "@/modules/gateway-usage/components/live-usage-collapsible";
import {
  UsageStatTiles,
  UsageStatTilesSkeleton,
} from "@/modules/gateway-usage/components/usage-stat-tiles";
import {
  UsageByCatalogTable,
  UsageTopErrors,
} from "@/modules/gateway-usage/components/usage-breakdown";
import { UsageStatusBreakdown } from "@/modules/gateway-usage/components/usage-status-chart";
import { TopErrorUsersTable, TopUsersTable } from "@/modules/gateway-usage/components/admin-usage-tables";

// Names the citizen a drilled view belongs to, via the existing admin users
// show. Gated on users-view and swallowing failures — a header nicety, not a
// guard — with the uuid as the honest fallback.
async function getDrilledUserName(uuid: string): Promise<string | null> {
  if (!(await adminCan(PERMISSIONS.usersView))) return null;
  try {
    const { data } = await apiFetch<{ data: { display_name: string | null } }>(
      `/users/${uuid}`,
      { next: { tags: [`users:${uuid}`] } },
      "admin",
    );
    return data.display_name;
  } catch {
    return null;
  }
}

// Platform-wide gateway usage, appended to the admin dashboard.
//
// One admin shape from one endpoint: every by_catalog row carries partner
// latency + 5xx (platform-wide and drilled alike), so Gateway health and the
// full verdict render either way. Only the developer rankings are
// platform-wide-only; the component branches on their presence rather than on
// the param, so a response that omits them degrades gracefully.
export async function AdminUsageDashboard({
  searchParams,
}: {
  searchParams: Promise<{
    interval?: string | string[];
    from?: string | string[];
    to?: string | string[];
    platform?: string | string[];
    user_uuid?: string | string[];
  }>;
}) {
  // The same permission as the realtime panel. Checked here rather than at the
  // page so the rest of the dashboard still renders for an admin without it.
  if (!(await adminCan(PERMISSIONS.dashboardView))) return null;

  const raw = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const userUuid = first(raw.user_uuid)?.trim() || undefined;
  // Who the drill is about. Same treatment as the scoped gateway-logs list:
  // the usage endpoint is gated on dashboard-view alone, so an admin can
  // reach this without users-view — the header then falls back to the uuid.
  const drilledName = userUuid ? await getDrilledUserName(userUuid) : null;
  // The View logs button leads to the gateway-logs screen, which has its own
  // permission — dashboard-view alone must not offer a destination that 403s.
  // users-view gates the developer rankings the same way: they name citizens,
  // which is exactly what that permission protects.
  const [canViewLogs, canViewUsers] = await Promise.all([
    adminCan(PERMISSIONS.gatewayLogsView),
    adminCan(PERMISSIONS.usersView),
  ]);
  const query = buildUsageQuery({
    interval: first(raw.interval),
    from: first(raw.from),
    to: first(raw.to),
    platform: first(raw.platform),
  });

  const result = await getAdminUsageDashboard(query, userUuid);

  // The scope the live chart draws, as the logs list's own params.
  const liveLogsParams = new URLSearchParams();
  if (query.platform) liveLogsParams.set("platform", query.platform);
  if (userUuid) liveLogsParams.set("user", userUuid);
  const liveLogsQuery = liveLogsParams.toString();

  // Drilling in keeps the window and platform filter, so the numbers a reader
  // just looked at are the numbers they drill into.
  const drillHref = (uuid: string) =>
    `/admin?${usageQueryString(query, { user_uuid: uuid })}`;
  const backHref = `/admin?${usageQueryString(query)}`;

  // Declared once and rendered beside the control it explains — which is now
  // inside Calls over time — and in the zero-state, where an empty result is
  // exactly when a silently swapped window is the explanation.
  const rangeNotice = query.rejected ? (
    <p role="alert" className="text-xs text-amber-700 dark:text-amber-400">
      {query.rejected === "incomplete"
        ? "A custom range needs both a start and an end — showing the default window instead."
        : `That date range isn't in the format this view accepts (${
            query.interval === "hour" ? "YYYY-MM-DD HH:mm" : "YYYY-MM-DD"
          }) — showing the default window instead.`}
    </p>
  ) : null;

  return (
    <section aria-labelledby="admin-usage-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="admin-usage-heading" className="text-lg font-semibold tracking-tight">
            Gateway API usage
          </h2>
          {/* Scope-neutral on purpose — the view may be narrowed to one
              developer or one API, and the chips beside it say so; prose
              claiming "every developer" would lie the moment a filter is on. */}
          <p className="mt-1 text-sm text-muted-foreground">
            Calls against the partner gateway.
          </p>
        </div>
        {/* The section-wide scope stays in the header — unlike the window
            control, the drill and the platform filter govern everything
            below. Each is escapable where it is announced, and the one road
            OUT to the raw logs sits beside them, carrying the same scope. */}
        <div className="flex flex-wrap items-center gap-2">
          {query.platform && (
            <Link
              href={platformFilterHref(query, null, userUuid)}
              aria-label={`Clear the ${query.platform} filter`}
              className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 py-1 pl-2.5 pr-2 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className="text-muted-foreground">Filtered to</span>
              {/* Colored on purpose: the hue identifies the partner here,
                  same as in the log lists — this chip IS the identity. */}
              <PlatformBadge platform={query.platform} />
              <X
                aria-hidden
                className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground"
              />
            </Link>
          )}
          {/* The drill as a pill, matching the platform chip — the × returns
              to all developers, keeping the window and platform filter. */}
          {userUuid && (
            <Link
              href={backHref}
              aria-label="Show all developers"
              className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 py-1 pl-2.5 pr-2 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className="text-muted-foreground">Developer</span>
              <span className="max-w-48 truncate text-foreground">{drilledName ?? userUuid}</span>
              <X
                aria-hidden
                className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
              />
            </Link>
          )}
          <LiveViewToggle />
          {canViewLogs && (
            <Link
              href={`/admin/gateway-logs${liveLogsQuery ? `?${liveLogsQuery}` : ""}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <ScrollText aria-hidden className="size-3.5 text-muted-foreground" />
              View logs
            </Link>
          )}
        </div>
      </div>

      {!result.ok ? (
        <EmptyState
          icon={result.forbidden ? Lock : result.unavailable ? CloudOff : AlertTriangle}
          title={
            result.forbidden
              ? "No access to the usage dashboard"
              : result.unavailable
                ? "Usage analytics are taking a break"
                : "Couldn't load usage"
          }
          description={result.message}
        />
      ) : result.data.totals.calls === 0 ? (
        <>
          {/* Still live, and LIVE FIRST as in the populated branch — so
              switching windows never reorders the page (same collapsed
              layout in both, so an empty window doesn't reshape the card). */}
          <LiveUsageCollapsible
            subtitle={
              userUuid
                ? "This developer's calls in real time — the last 60 seconds. Starts fresh each time you open this."
                : "Calls from every developer in real time — the last 60 seconds. Starts fresh each time you open this."
            }
          >
            <LiveUsageChart
              audience="admin"
              channel="administrators"
              platform={query.platform ?? ""}
              userUuid={userUuid ?? null}
              showHeading={false}
            />
          </LiveUsageCollapsible>
          {/* The window control renders in the zero-state too: an empty
              window is exactly when the reader needs to reach for a wider
              one, and without it the only way out is editing the URL. */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Calls over time</h3>
              <p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">
                {INTERVAL_PRESET[query.interval].span}. The current period appears
                once it finishes, so every figure is final.
              </p>
            </div>
            <UsageIntervalToggle />
          </div>
          {rangeNotice}
          <EmptyState
            icon={BarChart3}
            title="No API calls in this window"
            description={
              userUuid
                ? "This developer made no calls in the selected window."
                : "No developer called the gateway in the selected window."
            }
          />
        </>
      ) : (
        <>
          <HealthVerdictLine
            byCatalog={result.data.by_catalog}
            hrefs={Object.fromEntries(
              result.data.by_catalog.map((row) => [
                row.platform,
                platformFilterHref(query, row.platform, userUuid),
              ]),
            )}
          />

          {/* LIVE FIRST, as on the citizen dashboard. What the gateway is doing
              now leads; what it did sits underneath. Both charts are titled
              here rather than inside themselves, so each gets a sentence
              saying what it is before the reader interprets a plot. */}
          {/* The blip's next question — "which calls were those?" — is
              answered by the View logs button in the section header, which
              carries the same scope this chart draws. The shared
              `administrators` channel carries EVERY developer's calls, so the
              drill and the platform filter are applied client-side. */}
          <LiveUsageCollapsible
            subtitle={
              userUuid
                ? "This developer's calls in real time — the last 60 seconds. Starts fresh each time you open this."
                : "Calls from every developer in real time — the last 60 seconds. Starts fresh each time you open this."
            }
          >
            <LiveUsageChart
              audience="admin"
              channel="administrators"
              platform={query.platform ?? ""}
              userUuid={userUuid ?? null}
              showHeading={false}
            />
          </LiveUsageCollapsible>

          {/* The window control belongs to this block alone — it changes the
              counts and the historical chart, and nothing above it. */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Calls over time</h3>
              <p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">
                {INTERVAL_PRESET[query.interval].span}. The current period appears
                once it finishes, so every figure is final.
              </p>
            </div>
            <UsageIntervalToggle />
          </div>
          {rangeNotice}
          <UsageStatTiles totals={result.data.totals} previous={result.data.previous} />
          <UsageSeriesChart
            buckets={result.data.by_bucket}
            window={result.data.window}
            showHeading={false}
          />

          {/* Branch on the payload, not the param: the extras are what mark
              this as the platform-wide shape. Two rankings of the same
              developers side by side — by traffic and by errors — because
              the busiest are rarely the most broken. */}
          {result.data.top_user_by_calls && canViewUsers && (
            <div className="grid gap-4 lg:grid-cols-2">
              <TopUsersTable
                users={result.data.top_user_by_calls}
                hrefFor={drillHref}
                windowCalls={result.data.totals.calls}
              />
              <TopErrorUsersTable
                users={result.data.top_user_by_errors ?? []}
                hrefFor={drillHref}
                windowCalls={result.data.totals.calls}
              />
            </div>
          )}

          {/* API badges filter THIS dashboard (platform merged into the
              current url); the status and error cards below keep their log
              deep links — the dashboard has no status dimension to filter by.
              The logs themselves stay one click away via View logs, which
              carries the same scope. */}
          <UsageByCatalogTable
            rows={result.data.by_catalog}
            previousRows={result.data.previous?.by_catalog}
            previousWindowLabel={
              result.data.previous
                ? windowCaption(
                    result.data.previous.window.from,
                    result.data.previous.window.to,
                    result.data.window.interval,
                  )
                : undefined
            }
            withPartner
            platformHrefFor={(platform) => platformFilterHref(query, platform, userUuid)}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {/* null without gateway-logs-view: both cards degrade to plain
                rows instead of deep links into a screen that would 403. */}
            <UsageStatusBreakdown
              byStatus={result.data.by_status}
              logsHref={canViewLogs ? "/admin/gateway-logs" : null}
            />
            <UsageTopErrors
              errors={result.data.top_errors}
              logsHref={canViewLogs ? "/admin/gateway-logs" : null}
              windowCalls={result.data.totals.calls}
            />
          </div>
        </>
      )}
    </section>
  );
}

export function AdminUsageDashboardSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="h-5 w-44 animate-pulse rounded bg-muted" />
          <div className="h-3.5 w-80 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="h-9 w-52 animate-pulse rounded-lg bg-muted" />
      </div>
      <UsageStatTilesSkeleton />
      <div className="h-64 w-full animate-pulse rounded-xl border border-border bg-muted/30" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl border border-border bg-muted/30" />
        <div className="h-64 animate-pulse rounded-xl border border-border bg-muted/30" />
      </div>
    </div>
  );
}
