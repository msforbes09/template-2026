import Link from "next/link";
import { InfoHint } from "@/components/ui/info-hint";
import { formatNumber } from "@/lib/format-number";
import { cn } from "@/lib/utils";
import { PlatformBadge } from "@/modules/gateway-logs/components/platform-badge";
import {
  formatMs,
  formatRate,
  latencyPairTone,
  type LatencyPercentile,
} from "@/modules/gateway-usage/lib/usage-metrics";
import { RowTrend } from "@/modules/gateway-usage/components/row-trend";
import type { UsageByCatalog, UsageTopError } from "@/types/gateway-usage";

// The log list with one extra filter appended. The base may already carry a
// query (the citizen list lives behind ?tab=usage), hence the separator check.
export function logsHrefWith(base: string, param: string, value: string): string {
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${param}=${encodeURIComponent(value)}`;
}

// Filtered to one status code — exact "422" or a class "4xx" (the API expands
// classes to ranges).
export function filteredLogsHref(base: string, statusCode: string): string {
  return logsHrefWith(base, "status_code", statusCode);
}

// The most frequent failing codes, each linking to the matching log filter —
// a "429 × 20" that cannot be opened is a dead end.
export function UsageTopErrors({
  errors,
  logsHref,
  windowCalls = 0,
}: {
  errors: UsageTopError[];
  // Base path of the log viewer for this audience, or null to render plain
  // rows where there is no list to link to.
  logsHref: string | null;
  // The window's total CALL count — each code's share is of all traffic,
  // so it reads against the success rate above ("401s are 15% of calls").
  windowCalls?: number;
}) {
  return (
    <section
      aria-labelledby="usage-top-errors-heading"
      className="rounded-xl border border-border bg-card p-5"
    >
      <h3 id="usage-top-errors-heading" className="text-sm font-semibold tracking-tight">
        Most frequent errors
      </h3>
      {windowCalls > 0 && errors.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Count per status code, and its share of the window&apos;s traffic.
        </p>
      )}

      {errors.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No errors in this window — every call came back successfully.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {errors.map((error) => {
            const label = (
              <>
                <span className="font-mono text-xs font-medium">{error.status_code}</span>
                <span
                  className={cn(
                    "tabular-nums",
                    // Same 10% rule as the tables: one code eating a tenth of
                    // ALL traffic is an incident, not a statistic.
                    windowCalls > 0 && error.count / windowCalls >= 0.1
                      ? "font-medium text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {formatNumber(error.count)}
                  {windowCalls > 0 && (
                    <span className="opacity-70">
                      {" "}
                      · {formatRate(error.count / windowCalls, 1)}
                    </span>
                  )}
                </span>
              </>
            );
            return (
              <li key={error.status_code}>
                {logsHref ? (
                  <Link
                    href={filteredLogsHref(logsHref, error.status_code)}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {label}
                  </Link>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    {label}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// Per-API volume and latency.
//
// Deliberately NOT the allowance: the remaining balance already has a home —
// the per-catalog credit meters, fed by the profile endpoint — and repeating
// it here made this table answer two unrelated questions at once. This one is
// about traffic and speed (the BE dropped `by_catalog[].credits` entirely on
// 2026-08-31).
//
// With `withPartner` (the admin audiences — platform-wide AND the single-user
// drill) it becomes the ONE per-API table: the partner's own round-trip
// latency and 5xx rate ride each row (`partner_latency` / `error_rate_5xx`,
// folded in by the BE on 2026-08-31 — the separate partner_health array is
// gone). Citizens never receive those fields, so their table is unchanged and
// never learns upstream timings exist.
export function UsageByCatalogTable({
  rows,
  previousRows,
  previousWindowLabel,
  withPartner = false,
  logsHref,
  platformHrefFor,
}: {
  rows: UsageByCatalog[];
  // The previous window's rows (same shape), joined by platform to feed the
  // per-row trend popup. Absent, the table renders exactly as before.
  previousRows?: UsageByCatalog[];
  // That window's period, for the popup heading.
  previousWindowLabel?: string;
  // True for admin audiences: title the table Gateway health and render the
  // partner half of each latency pair plus the 5xx column.
  withPartner?: boolean;
  // Base path of this audience's log viewer; each API name links to the list
  // filtered to that platform. Null renders plain rows.
  logsHref?: string | null;
  // When given, the API badge FILTERS THE DASHBOARD instead of leaving for
  // the logs — the admin passes its own url with ?platform= merged in, so a
  // click narrows every tile and chart in place. Takes precedence over
  // logsHref for the badge; the logs stay reachable via View logs.
  platformHrefFor?: (platform: string) => string;
}) {
  // A platform with traffic in the PREVIOUS window but none now would vanish
  // from the table — hiding the most important trend on the page (something
  // went quiet). Synthesize a zero row for each, after the live rows, busiest
  // (previously) first; the trend column and its popup then tell the story.
  const currentPlatforms = new Set(rows.map((row) => row.platform));
  const dormant: UsageByCatalog[] = (previousRows ?? [])
    .filter((row) => !currentPlatforms.has(row.platform))
    .sort((a, b) => b.calls - a.calls)
    .map((row) => ({
      platform: row.platform,
      calls: 0,
      errors: 0,
      latency: { avg: null, p50: null, p95: null, p99: null },
    }));
  const allRows = [...rows, ...dormant];

  return (
    <section
      aria-labelledby="usage-by-catalog-heading"
      className="rounded-xl border border-border bg-card p-5"
    >
      <h3 id="usage-by-catalog-heading" className="text-sm font-semibold tracking-tight">
        {withPartner ? "Gateway health" : "By Platform"}
      </h3>
      {withPartner && (
        <p className="mt-1 text-xs text-muted-foreground">
          Traffic, speed and partner errors per API. Latency pairs read gateway · partner —
          the gateway figure includes the partner&apos;s.
        </p>
      )}

      {allRows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No calls to any API in this window.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className={cn("w-full text-left text-sm", withPartner ? "min-w-[34rem]" : "min-w-[30rem]")}>
            <thead>
              <tr className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                <th scope="col" className="pb-2 font-medium">Platform</th>
                {/* Slim, row-level: the arrow's popup compares EVERY metric,
                    so it gets its own column rather than riding one number.
                    Only where the previous rows were supplied at all —
                    admin audiences; the citizen shape never carries them. */}
                {previousRows !== undefined && (
                  <th scope="col" className="pb-2 font-medium">
                    <span className="sr-only">Trend vs previous window</span>
                  </th>
                )}
                <th scope="col" className="pb-2 text-right font-medium">Calls</th>
                <th scope="col" className="pb-2 text-right font-medium">Errors</th>
                <th scope="col" className="pb-2 text-right font-medium">
                  <span className="inline-flex items-center gap-1">
                    P50
                    <InfoHint
                      text={
                        withPartner
                          ? "Median response time (gateway · partner) — half of calls finished faster than this."
                          : "Median gateway response time — half of calls finished faster than this."
                      }
                    />
                  </span>
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  <span className="inline-flex items-center gap-1">
                    P95
                    <InfoHint
                      text={
                        withPartner
                          ? "95% of calls finished within this (gateway · partner) — only the slowest 1 in 20 took longer."
                          : "95% of calls finished within this — only the slowest 1 in 20 took longer."
                      }
                    />
                  </span>
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  <span className="inline-flex items-center gap-1">
                    P99
                    <InfoHint
                      text={
                        withPartner
                          ? "99% of calls finished within this (gateway · partner) — only the slowest 1 in 100 took longer."
                          : "99% of calls finished within this — only the slowest 1 in 100 took longer."
                      }
                    />
                  </span>
                </th>
                {withPartner && (
                  <th scope="col" className="pb-2 pl-3 text-right font-medium">
                    <span className="inline-flex items-center gap-1">
                      5xx
                      <InfoHint text="The share of this API's calls the partner answered with a server error." />
                    </span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {allRows.map((row) => {
                const previous = previousRows?.find(
                  (candidate) => candidate.platform === row.platform,
                );
                // 5% of calls failing server-side is a partner problem worth
                // seeing at a glance. Never colour alone — the rate is
                // printed beside it either way.
                const unhealthy = (row.error_rate_5xx ?? 0) >= 0.05;
                // "1.0s · 780ms": gateway first (it CONTAINS the partner
                // time), partner beside it — always shown when the partner
                // figure exists, so the pair reads consistently down the
                // column. The header hint defines the pair.
                //
                // BOTH halves take the critical tone, judged independently by
                // the same percentile bar. That is what makes the pair worth
                // printing: "17s · 17s" in red says the partner IS the cause,
                // "17s · 120ms" says the time is ours. Colouring only the
                // gateway left a 17s partner reading as calm grey.
                //
                // The partner half keeps its /60 opacity in either tone, so the
                // gateway figure still leads and the pair stays legible as a
                // pair — hierarchy by weight, not by withholding the alarm.
                const latencyPair = (percentile: LatencyPercentile) => {
                  const gateway = row.latency[percentile];
                  const upstream = withPartner ? row.partner_latency?.[percentile] : null;
                  const tone = latencyPairTone(percentile, gateway, upstream);
                  return {
                    // Same destructive red as Errors and 5xx: one visual
                    // language for "past the line".
                    className: cn(
                      "py-2.5 text-right tabular-nums",
                      tone.gateway === "critical"
                        ? "font-medium text-destructive"
                        : "text-muted-foreground",
                    ),
                    content: (
                      <>
                        {formatMs(gateway)}
                        {tone.partner !== null && (
                          <span
                            className={
                              tone.partner === "critical"
                                ? "font-normal text-destructive/60"
                                : "text-muted-foreground/60"
                            }
                          >
                            {" · "}
                            {formatMs(upstream)}
                          </span>
                        )}
                      </>
                    ),
                  };
                };
                const latency = {
                  p50: latencyPair("p50"),
                  p95: latencyPair("p95"),
                  p99: latencyPair("p99"),
                };
                return (
                  <tr key={row.platform} className="border-t border-border">
                    <td className="py-2.5">
                      {(() => {
                        const badgeHref = platformHrefFor
                          ? platformHrefFor(row.platform)
                          : logsHref
                            ? logsHrefWith(logsHref, "platform", row.platform)
                            : null;
                        return badgeHref ? (
                          <Link
                            href={badgeHref}
                            className="inline-flex rounded-md transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                          >
                            <PlatformBadge platform={row.platform} muted />
                          </Link>
                        ) : (
                          <PlatformBadge platform={row.platform} muted />
                        );
                      })()}
                    </td>
                    {previousRows !== undefined && (
                      <td className="py-2.5 pl-2">
                        <RowTrend row={row} previous={previous} windowLabel={previousWindowLabel} />
                      </td>
                    )}
                    <td className="py-2.5 text-right tabular-nums">{formatNumber(row.calls)}</td>
                    <td
                      className={cn(
                        "py-2.5 text-right tabular-nums",
                        // Red only when the RATE alarms — same 10% rule as
                        // Busiest developers. A red count on every row with
                        // any error made red mean nothing.
                        row.calls > 0 && row.errors / row.calls >= 0.1
                          ? "font-medium text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatNumber(row.errors)}
                      {/* The rate the colour keys off, stated rather than
                          implied. */}
                      {row.errors > 0 && row.calls > 0 && (
                        <span className="opacity-70"> · {formatRate(row.errors / row.calls, 1)}</span>
                      )}
                    </td>
                    {/* The median leads (see the tile: an average hides in a
                        skewed distribution); avg still arrives in the payload
                        unshown. */}
                    <td className={latency.p50.className}>{latency.p50.content}</td>
                    <td className={latency.p95.className}>{latency.p95.content}</td>
                    <td className={latency.p99.className}>{latency.p99.content}</td>
                    {withPartner && (
                      <td
                        className={cn(
                          "py-2.5 pl-3 text-right tabular-nums",
                          unhealthy ? "font-medium text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {/* count · rate, the same language as the Errors
                            column; the rate suffix earns its place only when
                            there is a count to rate. */}
                        {row.error_rate_5xx !== undefined ? (
                          <>
                            {formatNumber(row.errors_5xx ?? 0)}
                            {(row.errors_5xx ?? 0) > 0 && (
                              <span className="opacity-70"> · {formatRate(row.error_rate_5xx, 1)}</span>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
