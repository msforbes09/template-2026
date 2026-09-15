"use client";

import { useId } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatNumber } from "@/lib/format-number";
import { cn } from "@/lib/utils";
import { bucketLabel, bucketTooltipLabel, niceCeiling, windowCaption } from "@/modules/gateway-usage/lib/usage-metrics";
import type { UsageBucket, UsageWindow } from "@/types/gateway-usage";

// Calls over the window: successful calls as bars, errors as a line over them.
//
// Two marks, ONE Y-AXIS. Errors are a subset of the same measure — a count of
// calls — so they belong on the same scale, and a healthy window puts a
// near-flat error line under tall bars. That flatness is the finding, not a
// rendering problem: giving errors their own axis so the line looked
// comparable would be the dual-axis anti-pattern, and would draw 37 errors at
// the same height as 1,200 successes.
//
// The bar is `successful` (calls − errors), so bar + line = calls at any
// bucket. The headline total is on the tiles above; the reader gets volume
// from the bars and the error trend from the line without either being
// implied by the other.
//
// Rendered generically off `window.interval` — the bucket count is whatever the
// API returned (24 hours, 30 days, 8 weeks, or a custom span), never assumed.
// The series is zero-filled by the API, so a flat bucket is a real zero rather
// than missing data.
//
// A client component because Recharts measures the DOM. It is a leaf: the
// server components above it do the fetching and hand it plain data.

// Colours come from the project's own --chart-* tokens rather than hex, so the
// chart follows the theme in both modes. Validated against the real chart
// surfaces (#ffffff light, #0d1530 dark) with the dataviz skill's
// validate_palette.js: contrast ≥3:1, CVD ΔE 26.9 light / 15.8 dark, and
// normal-vision ΔE 39.4 / 21.2 — all clear. The dark steps sit above the
// skill's lightness band, which is a pre-existing property of this theme's
// chart tokens (the same trade-off the admin ECG panel documents) and does not
// affect separation or contrast.
const CHART_CONFIG = {
  successful: { label: "Successful", color: "var(--chart-1)" },
  errors: { label: "Errors", color: "var(--chart-3)" },
} satisfies ChartConfig;

// The legend swatch paints item.color as a CSS background, and the
// successful bar's own fill is a gradient url(#...) — invalid there, which
// left "Successful" swatchless. Recharts hands this element its computed
// payload; the colors are remapped to the solid chart variables before the
// stock content renders them.
function SolidSwatchLegend(
  props: React.ComponentProps<typeof ChartLegendContent>,
) {
  const payload = props.payload?.map((item) => ({
    ...item,
    color: item.dataKey ? `var(--color-${String(item.dataKey)})` : item.color,
  }));

  return <ChartLegendContent {...props} payload={payload} />;
}

export function UsageSeriesChart({
  buckets,
  window,
  showHeading = true,
  className,
}: {
  buckets: UsageBucket[];
  window: UsageWindow;
  // False where the caller titles the chart itself. The window caption stays
  // either way — it says WHICH range is drawn, which the title does not.
  showHeading?: boolean;
  className?: string;
}) {
  // Above the early return: a hook must run on every render, in the same
  // order. Unique per instance, too — two charts sharing a gradient def would
  // have the second silently repaint the first.
  const gradientId = useId().replace(/:/g, "");

  if (buckets.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        No usage recorded in this window.
      </p>
    );
  }

  const data = buckets.map((bucket) => ({
    label: bucketLabel(bucket, window.interval),
    // The full period for the tooltip — "2026-08-28 13:00 – 13:59",
    // "2026-08-28", "2026-08-01 – 2026-08-07" — so an axis reading "13:00"
    // still shows exactly what the bucket covers.
    tooltipLabel: bucketTooltipLabel(bucket, window.interval),
    bucket: bucket.bucket,
    successful: Math.max(bucket.calls - bucket.errors, 0),
    errors: bucket.errors,
  }));

  // 1-2-5 axis ceiling over the tallest DRAWN value. Not b.calls: the chart
  // never draws calls as one shape — the bar is `successful` and the line is
  // `errors`, each at its own absolute height — so sizing on their sum left
  // dead headroom (a 55-bar/60-line bucket forced a 200 rung).
  const ceiling = niceCeiling(
    Math.max(...data.map((d) => Math.max(d.successful, d.errors))),
  );
  const totalCalls = buckets.reduce((sum, b) => sum + b.calls, 0);
  const totalErrors = buckets.reduce((sum, b) => sum + b.errors, 0);

  // Thin out tick labels so they never collide, whatever the bucket count.
  const tickEvery = Math.max(1, Math.ceil(buckets.length / 8));

  return (
    <figure className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <figcaption
        className={cn(
          "mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1",
          showHeading ? "justify-between" : "justify-end",
        )}
      >
        {showHeading && (
          <h3 className="text-sm font-semibold tracking-tight">Calls over time</h3>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">
          {windowCaption(window.from, window.to, window.interval)}
        </span>
      </figcaption>

      <ChartContainer
        config={CHART_CONFIG}
        className="aspect-auto h-48 w-full sm:h-60"
        // Named for a screen reader, which cannot read the plot — the table
        // below carries the actual values.
        role="img"
        aria-label={`Calls per ${window.interval}: ${formatNumber(totalCalls)} in total, ${formatNumber(totalErrors)} of them errors. The table below lists every bucket.`}
      >
        <ComposedChart accessibilityLayer data={data} margin={{ left: 4, right: 4, top: 4 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={16}
            interval={tickEvery - 1}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={36}
            allowDecimals={false}
            domain={[0, ceiling]}
            ticks={[0, ceiling / 2, ceiling]}
            tickFormatter={(value: number) => formatNumber(value)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => payload?.[0]?.payload?.tooltipLabel ?? ""}
                formatter={(value, name) => (
                  <>
                    <span className="text-muted-foreground">
                      {CHART_CONFIG[name as keyof typeof CHART_CONFIG]?.label ?? name}
                    </span>
                    <span className="ml-auto font-mono font-medium tabular-nums">
                      {formatNumber(Number(value))}
                    </span>
                  </>
                )}
              />
            }
          />
          {/* Lighter than the live chart's fill, and for a reason: this one
              lies OVER the bars rather than over empty plot, so the tint has
              to leave the volume underneath readable. It marks the error
              line's territory without becoming a second surface. */}
          <defs>
            {/* Bars are tinted rather than flat: full strength at the top,
                easing off toward the baseline. Height still carries the
                magnitude — the fade is texture, not a second encoding — so
                bars stay comparable while the grid reads through their feet.
                It stops at 0.4 rather than fading out entirely, because a bar
                that dissolves at the axis loses the baseline the eye measures
                every other bar against. */}
            <linearGradient id={`${gradientId}-successful`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-successful)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="var(--color-successful)" stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id={`${gradientId}-errors`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-errors)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--color-errors)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* Bars first so the error line and its fill draw over them rather
              than under. */}
          <Bar
            dataKey="successful"
            fill={`url(#${gradientId}-successful)`}
            radius={[4, 4, 0, 0]}
          />
          {/* 2px per the mark spec. No dot per point — at 24 to 30 buckets
              that is a row of confetti; the active dot appears on hover, where
              a reader is actually asking about one bucket. */}
          <Area
            type="monotone"
            dataKey="errors"
            stroke="var(--color-errors)"
            strokeWidth={2}
            fill={`url(#${gradientId}-errors)`}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <ChartLegend content={<SolidSwatchLegend />} />
        </ComposedChart>
      </ChartContainer>

      {/* The table view the accessibility pass requires: every bucket as text,
          for a screen reader, a print-out, or anyone who cannot separate the
          bar from the line. Lists both marks AND the total they make up, so
          the one number the chart does not draw is still readable. Collapsed
          so it does not compete with the chart. */}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          View as table
        </summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted/60">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Bucket</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Successful</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Errors</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Calls</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((bucket) => (
                <tr key={bucket.bucket} className="border-t border-border">
                  <td className="px-3 py-1.5">{bucket.bucket}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {formatNumber(Math.max(bucket.calls - bucket.errors, 0))}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(bucket.errors)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(bucket.calls)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
