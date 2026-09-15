"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatNumber } from "@/lib/format-number";
import { cn } from "@/lib/utils";
import { formatMs, formatRate } from "@/modules/gateway-usage/lib/usage-metrics";
import type { UsageByCatalog } from "@/types/gateway-usage";

// One quiet arrow beside the Calls value — direction of traffic vs the
// previous window — with the WHOLE row's comparison behind a hover. This
// replaced printed per-column deltas: with per-row denominators as small as a
// handful of calls those produced alarm-shaped noise like "▲ 1300%", while an
// icon carries the trend without shouting a percentage (2026-08-31).
//
// A real BUTTON like InfoHint, so the tooltip opens on hover AND keyboard
// focus, with the summary in the aria-label.
export function RowTrend({
  row,
  previous,
  windowLabel,
}: {
  row: UsageByCatalog;
  // The same platform's row in the previous window; absent (no calls then)
  // renders nothing — a start is not a trend.
  previous?: UsageByCatalog;
  // The previous window's period ("2026-08-01 — 2026-08-30"), shown as the
  // popup's heading so the reader knows WHICH window the left side of each
  // arrow describes.
  windowLabel?: string;
}) {
  if (!previous) return null;

  const direction = row.calls > previous.calls ? "up" : row.calls < previous.calls ? "down" : "flat";
  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;

  // Errors compare as RATES — the counts ride the traffic volume, the rate is
  // the health signal.
  const errorRate = (value: UsageByCatalog) =>
    value.calls > 0 ? formatRate(value.errors / value.calls, 1) : "—";

  const lines: [string, string][] = [
    ["Calls", `${formatNumber(previous.calls)} → ${formatNumber(row.calls)}`],
    ["Errors", `${errorRate(previous)} → ${errorRate(row)}`],
    ["P50", `${formatMs(previous.latency.p50)} → ${formatMs(row.latency.p50)}`],
    ["P95", `${formatMs(previous.latency.p95)} → ${formatMs(row.latency.p95)}`],
    ["P99", `${formatMs(previous.latency.p99)} → ${formatMs(row.latency.p99)}`],
  ];
  if (row.error_rate_5xx !== undefined && previous.error_rate_5xx !== undefined) {
    lines.push(["5xx", `${formatRate(previous.error_rate_5xx, 1)} → ${formatRate(row.error_rate_5xx, 1)}`]);
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          aria-label={`Calls ${direction === "flat" ? "unchanged" : direction} vs the previous window — hover for the full comparison`}
          className={cn(
            "inline-flex shrink-0 items-center rounded-full align-middle text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <Icon aria-hidden className="size-3.5" />
        </TooltipTrigger>
        {/* The base TooltipContent lays children out in a ROW (inline-flex
            items-center) — stacked here so the period heads its own line
            above the comparison grid. */}
        <TooltipContent className="flex-col items-stretch gap-1 text-left normal-case tracking-normal">
          {windowLabel && (
            <p className="whitespace-nowrap font-medium tabular-nums text-background/70">
              {windowLabel}
            </p>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 tabular-nums">
            {lines.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-background/60">{label}</dt>
                <dd className="whitespace-nowrap text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
