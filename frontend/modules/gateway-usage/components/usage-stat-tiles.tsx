import { Activity, AlertTriangle, CircleCheck, Timer, TrendingDown, TrendingUp } from "lucide-react";
import { InfoHint } from "@/components/ui/info-hint";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format-number";
import {
  delta,
  deltaTone,
  formatDelta,
  formatMs,
  formatRate,
  type MetricSense,
} from "@/modules/gateway-usage/lib/usage-metrics";
import type { UsagePrevious, UsageTotals } from "@/types/gateway-usage";

// The four headline numbers. Stat tiles rather than charts: each is a single
// value whose job is to be read, and a chart of one number is decoration.

// A delta's colour follows whether the change is GOOD, not whether it is up —
// errors rising is not an improvement. It is never colour alone: the arrow
// direction and the signed number both carry it.
function DeltaChip({
  current,
  previous,
  sense,
}: {
  current: number;
  previous: number | null | undefined;
  sense: MetricSense;
}) {
  const change = delta(current, previous);
  const tone = deltaTone(change.direction, sense);

  // No previous window, or a previous of zero — a start is not a percentage
  // increase, so there is nothing honest to put here.
  if (change.ratio == null) {
    return <span className="text-xs text-muted-foreground">no prior period</span>;
  }

  const Icon = change.direction === "down" ? TrendingDown : TrendingUp;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        tone === "good" && "text-emerald-700 dark:text-emerald-400",
        tone === "bad" && "text-destructive",
        tone === "flat" && "text-muted-foreground",
      )}
    >
      {change.direction !== "flat" && <Icon aria-hidden className="size-3.5" />}
      {formatDelta(change.ratio)}
      <span className="font-normal text-muted-foreground">vs previous</span>
    </span>
  );
}

function Tile({
  label,
  value,
  icon: Icon,
  hint,
  children,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
  // One sentence saying what this figure IS, behind an info icon. Only for
  // figures that need explaining (latency percentiles) — a hint on "Calls"
  // explains nothing.
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        <Icon aria-hidden className="size-3.5" />
        {label}
        {hint && <InfoHint text={hint} />}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function UsageStatTiles({
  totals,
  previous,
}: {
  totals: UsageTotals;
  previous: UsagePrevious | null;
}) {
  const prev = previous?.totals;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile label="Calls" value={formatNumber(totals.calls)} icon={Activity}>
        <DeltaChip current={totals.calls} previous={prev?.calls} sense="more-is-better" />
      </Tile>

      <Tile label="Success rate" value={formatRate(totals.success_rate)} icon={CircleCheck}>
        <DeltaChip
          current={totals.success_rate}
          previous={prev?.success_rate}
          sense="more-is-better"
        />
      </Tile>

      <Tile label="Errors" value={formatNumber(totals.errors)} icon={AlertTriangle}>
        <DeltaChip current={totals.errors} previous={prev?.errors} sense="less-is-better" />
      </Tile>

      {/* The MEDIAN, with the tail beside it. Latency distributions are
          right-skewed, so a handful of timeouts drags an average until it
          describes nobody's call — p50 stays at what a typical call felt
          like. The avg still arrives in the payload, just not shown. */}
      <Tile
        label="Latency"
        value={formatMs(totals.latency.p50)}
        icon={Timer}
        hint="Median response time — half of calls finished faster than this. P95 and P99: the times 95% and 99% of calls finished within."
      >
        <span className="text-xs text-muted-foreground tabular-nums">
          P95 {formatMs(totals.latency.p95)} · P99 {formatMs(totals.latency.p99)}
        </span>
      </Tile>
    </div>
  );
}

export function UsageStatTilesSkeleton() {
  return (
    <div aria-hidden className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[6.5rem] animate-pulse rounded-xl border border-border bg-muted/30" />
      ))}
    </div>
  );
}
