import Link from "next/link";
import { AlertTriangle, BarChart3, CloudOff, ScrollText, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { PlatformBadge } from "@/modules/gateway-logs/components/platform-badge";
import { getClientUsageDashboard } from "@/modules/gateway-usage/lib/get-usage-dashboard";
import {
  buildUsageQuery,
  INTERVAL_PRESET,
  platformFilterHref,
} from "@/modules/gateway-usage/lib/usage-window";
import { UsageIntervalToggle } from "@/modules/gateway-usage/components/usage-interval-toggle";
import { UsageSeriesChart } from "@/modules/gateway-usage/components/usage-series-chart";
import { LiveUsageChart } from "@/modules/gateway-usage/components/live-usage-chart";
import { LiveUsageCollapsible, LiveViewToggle } from "@/modules/gateway-usage/components/live-usage-collapsible";
import { logsHrefWith } from "@/modules/gateway-usage/components/usage-breakdown";
import {
  UsageStatTiles,
  UsageStatTilesSkeleton,
} from "@/modules/gateway-usage/components/usage-stat-tiles";
import {
  UsageByCatalogTable,
  UsageTopErrors,
} from "@/modules/gateway-usage/components/usage-breakdown";
import { UsageStatusBreakdown } from "@/modules/gateway-usage/components/usage-status-chart";

// The citizen's own gateway usage, appended to /dashboard.
//
// Historical and polled, never live: the API always excludes the in-progress
// period, so the newest bar is the last COMPLETE hour/day/week. That is why
// the caption says which window is shown rather than implying "now".
export async function ClientUsageDashboard({
  uuid,
  searchParams,
}: {
  // Names the citizen's private broadcast channel (`private-user.{uuid}`) for
  // the live trace. Passed down rather than re-fetched: the dashboard already
  // has the profile in hand.
  uuid: string | null | undefined;
  searchParams: Promise<{
    interval?: string | string[];
    from?: string | string[];
    to?: string | string[];
    platform?: string | string[];
  }>;
}) {
  const raw = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const query = buildUsageQuery({
    interval: first(raw.interval),
    from: first(raw.from),
    to: first(raw.to),
    platform: first(raw.platform),
  });

  const result = await getClientUsageDashboard(query);

  // A custom range that could never have been valid is dropped rather than
  // sent — but silently falling back to the preset would look like the filter
  // was ignored, so it says so. Declared once and rendered beside the control
  // it explains, which is now inside Calls over time rather than at the top.
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
    <section aria-labelledby="usage-dashboard-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="usage-dashboard-heading"
            className="text-lg font-semibold tracking-tight"
          >
            API <span className="text-primary">usage</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            What your system is doing against the eGov APIs.
          </p>
        </div>
        {/* Same header furniture as the admin dashboard: the active platform
            chip (escapable where announced), the live-view toggle, and the
            road to the raw logs — flex-wrap so the group stacks under the
            title on narrow screens instead of overflowing. */}
        <div className="flex flex-wrap items-center gap-2">
          {query.platform && (
            <Link
              href={platformFilterHref(query, null, undefined, "/dashboard")}
              aria-label={`Clear the ${query.platform} filter`}
              className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 py-1 pl-2.5 pr-2 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className="text-muted-foreground">Filtered to</span>
              <PlatformBadge platform={query.platform} />
              <X
                aria-hidden
                className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground"
              />
            </Link>
          )}
          <LiveViewToggle />
          <Link
            href={
              query.platform
                ? logsHrefWith("/dashboard/developers?tab=usage", "platform", query.platform)
                : "/dashboard/developers?tab=usage"
            }
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ScrollText aria-hidden className="size-3.5 text-muted-foreground" />
            View logs
          </Link>
        </div>
      </div>

      {!result.ok ? (
        <EmptyState
          icon={result.unavailable ? CloudOff : AlertTriangle}
          title={
            result.unavailable
              ? "Usage analytics are taking a break"
              : "Couldn't load your usage"
          }
          description={result.message}
        />
      ) : result.data.totals.calls === 0 ? (
        // Zero is a real answer here, not a failure: the API returns zeros for
        // an account that has made no calls, so this must not read as an error.
        //
        // The live trace still renders. Someone with no history is exactly who
        // is likely to be watching for their first call to land, and hiding it
        // behind "no calls yet" would remove it precisely then.
        <>
          {/* LIVE FIRST here too, matching the populated branch — so
              switching windows never reorders the page (same collapsed
              layout in both). */}
          <LiveUsageCollapsible subtitle="Your calls in real time — the last 60 seconds. Starts fresh each time you open this.">
            <LiveUsageChart
              audience="client"
              channel={uuid ? `user.${uuid}` : null}
              platform={query.platform ?? ""}
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
          {/* Here too: an empty result is precisely when a silently swapped
              window is the explanation. */}
          {rangeNotice}
          <EmptyState
            icon={BarChart3}
            title="No API calls in this window"
            description="Once your system starts calling the eGov APIs with your credentials, the numbers appear here."
          />
        </>
      ) : (
        <>
          {/* LIVE FIRST. What is happening now leads; what happened is
              underneath — folded by default, since the historical window is
              the page's main story and the live feed is a tool you reach
              for. */}
          <LiveUsageCollapsible subtitle="Your calls in real time — the last 60 seconds. Starts fresh each time you open this.">
            <LiveUsageChart
              audience="client"
              channel={uuid ? `user.${uuid}` : null}
              platform={query.platform ?? ""}
              showHeading={false}
            />
          </LiveUsageCollapsible>

          {/* The window control sits HERE, not in the section header. It
              changes only what is below it — the counts and the historical
              chart. Above, next to the section title, it appeared to govern
              the live chart too, which has no window to choose. */}
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

          {/* API badges filter THIS dashboard, like the admin's; the status
              and error cards keep their log deep links. */}
          {/* No trend column here — the BE deliberately omits the previous
              window's catalog rows on the citizen shape. */}
          <UsageByCatalogTable
            rows={result.data.by_catalog}
            platformHrefFor={(platform) =>
              platformFilterHref(query, platform, undefined, "/dashboard")
            }
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <UsageStatusBreakdown
              byStatus={result.data.by_status}
              logsHref="/dashboard/developers?tab=usage"
            />
            <UsageTopErrors
              errors={result.data.top_errors}
              // The log list lives behind the Usage TAB — the bare page
              // opens on the catalog and drops the filter.
              logsHref="/dashboard/developers?tab=usage"
              windowCalls={result.data.totals.calls}
            />
          </div>
        </>
      )}
    </section>
  );
}

export function ClientUsageDashboardSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3.5 w-72 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="h-9 w-52 animate-pulse rounded-lg bg-muted" />
      </div>
      <UsageStatTilesSkeleton />
      <div className="h-64 w-full animate-pulse rounded-xl border border-border bg-muted/30" />
      <div className="h-48 w-full animate-pulse rounded-xl border border-border bg-muted/30" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-52 animate-pulse rounded-xl border border-border bg-muted/30" />
        <div className="h-52 animate-pulse rounded-xl border border-border bg-muted/30" />
      </div>
    </div>
  );
}
