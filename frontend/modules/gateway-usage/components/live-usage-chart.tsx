"use client";

import { useId, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Radio } from "lucide-react";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatNumber } from "@/lib/format-number";
import { liveTooltipLabel } from "@/modules/gateway-usage/lib/live-tooltip-label";
import { niceCeiling } from "@/modules/gateway-usage/lib/usage-metrics";
import { cn } from "@/lib/utils";
import {
  LIVE_WINDOW_SECONDS,
  useLiveUsageRate,
} from "@/modules/gateway-usage/lib/use-live-usage-rate";
import type { EchoAudience } from "@/lib/echo-client";

// Calls per second, live, over the last minute.
//
// NO BACKFILL, deliberately: the trace starts flat and fills as calls arrive,
// so it shows what is happening right now rather than re-drawing what the
// historical chart above it already covers. Those two answer different
// questions, which is why this one is not just a shorter version of it.
//
// The x-axis is SECONDS AGO rather than a clock time — it needs no Date on
// first render, so the server and client agree and there is no hydration
// mismatch and no timezone to get wrong.

// Same tokens as the historical chart, so a line means the same thing in both.
// Graph-paper target cell size. The real cell is derived from the plot
// height: the nearest EVEN number of rows to this target divides the height
// exactly, so gridlines land on the labeled ticks — 0, half and full (half is
// why the count must be even) — and the same cell is reused for the columns
// to keep the squares perfect.
const GRID_CELL_TARGET_PX = 24;

function gridCellPx(height: number): number {
  const rows = Math.max(2, 2 * Math.round(height / (2 * GRID_CELL_TARGET_PX)));
  return height / rows;
}

const CHART_CONFIG = {
  calls: { label: "Calls/sec", color: "var(--chart-1)" },
  errors: { label: "Errors/sec", color: "var(--chart-3)" },
} satisfies ChartConfig;

// Live means live: text, not colour alone.
function ConnectionDot({ status }: { status: string }) {
  const connected = status === "connected";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          connected ? "animate-pulse bg-emerald-500" : "bg-muted-foreground/50",
        )}
      />
      {connected ? "Live" : status === "connecting" ? "Connecting…" : "Offline"}
    </span>
  );
}

export function LiveUsageChart({
  audience,
  channel,
  platform = "",
  userUuid,
  height = "h-56 sm:h-72",
  showHeading = true,
  className,
}: {
  audience: EchoAudience;
  // The citizen's own private channel (`user.{uuid}`, ownership enforced
  // server-side so it only ever carries their own calls) or the shared
  // `administrators` one. Null when there is no channel to name — a citizen
  // whose profile has no uuid — in which case nothing renders and the socket
  // is never opened.
  channel: string | null;
  platform?: string;
  // Admin only: narrows the shared channel to one developer, matching the
  // dashboard's ?user_uuid= drill.
  userUuid?: string | null;
  // Plot height. Taller than the first cut, which was too short to read a
  // rate off — at 8rem a busy second and a quiet one looked nearly alike.
  height?: string;
  // False where the caller titles the chart itself, so the name is not read
  // twice. The live readout and connection state stay either way — they are
  // state, not a label.
  showHeading?: boolean;
  className?: string;
}) {
  // Gradient ids must be unique per instance: two charts sharing a def would
  // have the second silently repaint the first.
  const gradientId = useId().replace(/:/g, "");
  const enabled = Boolean(channel);
  const { bins, total, errorTotal, status } = useLiveUsageRate({
    audience,
    channel: channel ?? "",
    platform,
    userUuid,
    enabled,
  });

  const peak = Math.max(1, ...bins.map((bin) => bin.calls));
  // Ratchet: the ceiling climbs the 1-2-5 ladder with the traffic but never
  // steps back down within a session — a passing spike must not make the
  // whole chart stretch back up once it scrolls off. A refresh starts fresh.
  // State adjusted during render (the react.dev "storing information from
  // previous renders" pattern), which is the ref-free way to remember the
  // high-water mark.
  const [ceiling, setCeiling] = useState(10);
  const rung = niceCeiling(peak);
  if (rung > ceiling) setCeiling(rung);

  if (!enabled) return null;

  return (
    <figure className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <figcaption
        className={cn(
          "mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1",
          showHeading ? "justify-between" : "justify-end",
        )}
      >
        {showHeading && (
          <h3 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
            <Radio aria-hidden className="size-3.5 text-muted-foreground" />
            Right now
          </h3>
        )}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatNumber(total)} since you opened this
            {errorTotal > 0 ? ` · ${formatNumber(errorTotal)} failed` : ""}
          </span>
          <ConnectionDot status={status} />
        </div>
      </figcaption>

      <ChartContainer
        config={CHART_CONFIG}
        className={cn("aspect-auto w-full", height)}
        role="img"
        aria-label={`Live calls per second over the last ${LIVE_WINDOW_SECONDS} seconds. ${formatNumber(
          total,
        )} calls since this page opened, ${formatNumber(errorTotal)} of them errors.`}
      >
        <AreaChart data={bins} margin={{ left: 4, right: 8, top: 4 }}>
          {/* Graph paper: PERFECT SQUARES, so the spacing is fixed in pixels
              (one derived cell size both ways) rather than following the data ticks,
              and the lines are generated from the plot's offset. Anchored
              where the drawn axes cross — the bottom-LEFT corner — so the
              first column sits flush against the y-axis line and any partial
              cell lands at the top-right. Fixed lines are also
              what makes the motion legible: the trace slides past them
              instead of appearing to wobble. */}
          <CartesianGrid
            horizontal
            vertical
            verticalCoordinatesGenerator={({ offset }) => {
              const lines: number[] = [];
              const cell = gridCellPx(offset?.height ?? 0);
              if (cell <= 0) return lines;
              const left = offset?.left ?? 0;
              const right = left + (offset?.width ?? 0);
              for (let x = left; x <= right; x += cell) lines.push(x);
              return lines;
            }}
            horizontalCoordinatesGenerator={({ offset }) => {
              const lines: number[] = [];
              const cell = gridCellPx(offset?.height ?? 0);
              if (cell <= 0) return lines;
              const top = offset?.top ?? 0;
              const bottom = top + (offset?.height ?? 0);
              for (let y = bottom; y >= top - 0.5; y -= cell) lines.push(y);
              return lines;
            }}
          />
          {/* A NUMERIC axis over a fixed domain, not a category one. That is
              what makes the trace move: each bin's offset is fractional and
              shrinks every frame, so points slide continuously left toward
              "now" at the right edge instead of jumping a whole slot once a
              second. (An earlier `reversed` on a category axis put "now" on
              the LEFT and aged rightwards — backwards for a live trace.) */}
          <XAxis
            type="number"
            dataKey="offset"
            domain={[-LIVE_WINDOW_SECONDS, 0]}
            // Without this recharts widens the scale to fit the data, and any
            // drift in the data's extent drags the tick labels with it. Pinned,
            // the axis is furniture: it never moves, only the trace does.
            allowDataOverflow
            ticks={[-60, -45, -30, -15, 0]}
            tickLine
            axisLine
            tickMargin={8}
            tickFormatter={(value: number) =>
              value === 0 ? "now" : `${Math.abs(Math.round(value))}s`
            }
          />
          {/* Domain on the ratcheted 1-2-5 ceiling (min 10): a quiet window
              renders a flat line at the baseline instead of recharts zooming
              into the noise, and the axis no longer re-scales on every tick
              the way the exact-peak domain did. Three pinned ticks — every
              rung halves to an integer. */}
          <YAxis
            tickLine
            axisLine
            width={28}
            allowDecimals={false}
            domain={[0, ceiling]}
            ticks={[0, ceiling / 2, ceiling]}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                // Read off the ROW, not the first argument — see
                // liveTooltipLabel for why the first argument is not the axis
                // value here. Same shape usage-series-chart already uses for
                // its bucket label.
                labelFormatter={(_, payload) => liveTooltipLabel(payload?.[0]?.payload?.offset)}
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
          {/* Each area is filled from its OWN line colour, fading out
              downward — so the tint reads as belonging to that series rather
              than as a separate mark. Kept well under half opacity at the top:
              the two areas overlap (errors are a subset of calls, so the error
              area sits inside the calls area), and at a heavier fill the
              overlap would read as a third colour that means nothing. */}
          <defs>
            <linearGradient id={`${gradientId}-calls`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-calls)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-calls)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={`${gradientId}-errors`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-errors)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-errors)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* isAnimationActive OFF. Recharts' interpolation was tried here and
              reverted: it restarts on every data change rather than chaining,
              so at four updates a second it fought the redraw instead of
              smoothing it. The motion comes from the redraw itself — each one
              places the points a fraction further left.

              Calls first so the smaller error area draws over it rather than
              under. No per-point dot: 61 of them redrawing every tick is
              noise. */}
          <Area
            type="monotone"
            dataKey="calls"
            stroke="var(--color-calls)"
            strokeWidth={2}
            fill={`url(#${gradientId}-calls)`}
            dot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="errors"
            stroke="var(--color-errors)"
            strokeWidth={2}
            fill={`url(#${gradientId}-errors)`}
            dot={false}
            isAnimationActive={false}
          />
          <ChartLegend content={<ChartLegendContent />} />
        </AreaChart>
      </ChartContainer>

      {/* Only when this titles itself. Where the caller supplies an intro, the
          same sentence lives there instead of being repeated under the plot. */}
      {showHeading && (
        <p className="mt-2 text-xs text-muted-foreground">
          Live — the last {LIVE_WINDOW_SECONDS} seconds of calls. Starts fresh
          on every visit.
        </p>
      )}
    </figure>
  );
}
