import type { UsageBucket, UsageByCatalog, UsageInterval, UsageTotals } from "@/types/gateway-usage";

// Reading the numbers the dashboard renders. Pure — the seams worth testing
// are the ones where "no data" and "zero" have to stay different things.

export type Delta = {
  // Signed fraction, e.g. 0.13 for +13%. Null when there is no meaningful
  // comparison to make.
  ratio: number | null;
  direction: "up" | "down" | "flat";
};

// Change against the previous window.
//
// A previous value of 0 yields a NULL ratio, not Infinity and not 100%: going
// from no calls to some calls is not a percentage increase, it is a start.
// The caller shows the raw numbers in that case.
export function delta(current: number, previous: number | null | undefined): Delta {
  if (previous == null || previous === 0 || !Number.isFinite(previous)) {
    return { ratio: null, direction: current > 0 ? "up" : "flat" };
  }
  const ratio = (current - previous) / previous;
  return {
    ratio,
    direction: ratio > 0 ? "up" : ratio < 0 ? "down" : "flat",
  };
}

// Whether a metric going UP is good news. Calls rising is healthy; errors
// rising is not — the same arrow has to mean opposite things, so the caller
// asks rather than assuming green-is-up.
export type MetricSense = "more-is-better" | "less-is-better" | "neutral";

export function deltaTone(direction: Delta["direction"], sense: MetricSense): "good" | "bad" | "flat" {
  if (direction === "flat" || sense === "neutral") return "flat";
  const better = sense === "more-is-better" ? "up" : "down";
  return direction === better ? "good" : "bad";
}

// 0..1 → "97.0%". The API sends a fraction; rendering it raw would read as
// 0.97 calls succeeding.
export function formatRate(rate: number | null | undefined, digits = 1): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return `${(rate * 100).toFixed(digits)}%`;
}

// Signed, for a delta chip.
export function formatDelta(ratio: number | null): string {
  if (ratio == null || !Number.isFinite(ratio)) return "—";
  const pct = ratio * 100;
  const rounded = Math.abs(pct) >= 10 ? Math.round(pct) : Number(pct.toFixed(1));
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

// Milliseconds, with any latency field allowed to be null. "—" rather than "0
// ms": no timed calls is not the same as an instant response.
export function formatMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(ms >= 10_000 ? 0 : 1)}s`;
  return `${Math.round(ms)}ms`;
}

// The tallest bar, which sets the chart's scale. At least 1 so an all-zero
// window divides safely and renders a flat baseline rather than NaN heights.
// The y-axis top for a count chart: the first 1-2-5 rung (10, 20, 50, 100,
// 200, 500, 1000, 2000, ...) that holds the peak, floored at 10. A stepped
// ceiling keeps the axis from re-scaling on every data change the way an
// exact-peak domain does, and the floor stops a near-empty window from
// magnifying one stray call into a spike. Every rung halves to an integer,
// which is what lets charts pin their ticks to 0 / half / full.
export function niceCeiling(peak: number): number {
  let rung = 10;
  while (rung < peak) {
    rung = String(rung).startsWith("2") ? rung * 2.5 : rung * 2;
  }
  return rung;
}

export function peakCalls(buckets: UsageBucket[]): number {
  return Math.max(1, ...buckets.map((b) => b.calls));
}

export function hasAnyCalls(totals: UsageTotals): boolean {
  return totals.calls > 0;
}

// A readable label for a bucket, derived from its `from` rather than parsing
// the API's `bucket` string — that string's format changes with the interval
// (`Y-m-d H:00`, `Y-m-d`, `2026-W35`) and is documented as a label, not a
// contract.
//
// Deliberately string slicing, not date parsing: the timestamps are Asia/
// Manila wall-clock, and `new Date()` in a browser set to another timezone
// would shift every label by the offset — labelling an 08:00 bucket 00:00.
export function bucketLabel(bucket: UsageBucket, interval: UsageInterval): string {
  const from = bucket.from ?? "";
  if (interval === "hour") return from.slice(11, 16) || bucket.bucket;
  if (interval === "day") return from.slice(5, 10) || bucket.bucket;
  // Weekly buckets keep the API's own ISO-week label — deriving "week of" from
  // a date is exactly the arithmetic worth not repeating.
  return bucket.bucket;
}

// The page's headline. Deliberately NOT about 4xx rates — those are the
// developers' own mistakes, already red in the tables. This line watches the
// two things that are the PLATFORM's problem: partners failing server-side
// (the 5% line the table uses) and tails slow enough to be user-visible.
// Pure so the one sentence the admin reads first is under test.

// The bar each latency percentile turns critical at, in ms.
//
// One bar for all three would under-report the worst rows: a 17s MEDIAN is a
// worse fault than a 10s tail, yet a single 10s rule leaves it the same calm
// grey as a healthy 171ms. So the bars step roughly 2x apart, the shape a
// healthy distribution has — a row whose median is already seconds is in
// trouble whatever its tail does.
//
// Sized against real traffic: the busiest healthy API medians at ~791ms, so
// the 2s bar has ~2.5x headroom and never fires on normal load.
export const LATENCY_ALARM_MS = { p50: 2_000, p95: 5_000, p99: 10_000 } as const;

export type LatencyPercentile = keyof typeof LATENCY_ALARM_MS;

// Whether this percentile's figure has reached its bar. A dormant row carries
// nulls — "—" must never render as an alarm.
export function isLatencyCritical(
  percentile: LatencyPercentile,
  ms: number | null | undefined,
): boolean {
  return ms != null && Number.isFinite(ms) && ms >= LATENCY_ALARM_MS[percentile];
}

// The tone of one `gateway · partner` latency pair. Semantic, not classed —
// same split as deltaTone: the lib decides, the component maps to Tailwind.
//
// Both halves are judged by the SAME percentile bar, independently. The partner
// figure is a subset of the gateway's, so that is exactly what makes the pair
// diagnostic: "17s · 17s" says the partner IS the cause, "17s · 120ms" says the
// time is ours. Colouring only the gateway half hid that distinction — a
// partner at 17s read as calm grey.
//
// `partner` is null where there is no second half to tone: the citizen table
// never receives partner timings, and a dormant row has none.
export function latencyPairTone(
  percentile: LatencyPercentile,
  gateway: number | null | undefined,
  partner: number | null | undefined,
): { gateway: "critical" | "normal"; partner: "critical" | "normal" | null } {
  return {
    gateway: isLatencyCritical(percentile, gateway) ? "critical" : "normal",
    partner:
      partner == null ? null : isLatencyCritical(percentile, partner) ? "critical" : "normal",
  };
}

// A p99 in the tens of seconds is an outage-shaped tail, whatever the avg.
// DERIVED, not repeated: the verdict banner and the table's p99 column judge by
// this same number, and a copy would let them contradict each other on screen.
export const LATENCY_P99_ALARM_MS = LATENCY_ALARM_MS.p99;

export type HealthVerdict = {
  // APIs whose gateway p99 reached the alarm bar, with the value for copy.
  latencyAlarms: { platform: string; p99: number }[];
  // Partners answering 5%+ of calls with a 5xx, with the rate for the copy.
  partnerAlarms: { platform: string; rate: number }[];
};

export function healthVerdict(
  byCatalog: Pick<UsageByCatalog, "platform" | "latency" | "error_rate_5xx">[],
): HealthVerdict {
  return {
    latencyAlarms: byCatalog
      .filter((row) => row.latency.p99 !== null && row.latency.p99 >= LATENCY_P99_ALARM_MS)
      .map((row) => ({ platform: row.platform, p99: row.latency.p99 as number })),
    // The partner rate rides the same rows on the admin shape; a citizen row
    // has no rate and can never alarm.
    partnerAlarms: byCatalog
      .filter((row) => (row.error_rate_5xx ?? 0) >= 0.05)
      .map((row) => ({ platform: row.platform, rate: row.error_rate_5xx as number })),
  };
}

// The tooltip's fuller label: the whole period a bucket covers, in the same
// wall-clock strings the API sent (never Date-parsed — see bucketLabel).
// Hourly keeps the day: the 24h window crosses midnight, so "19:00 – 19:59"
// alone would not say WHICH evening.
export function bucketTooltipLabel(bucket: UsageBucket, interval: UsageInterval): string {
  const from = bucket.from ?? "";
  const to = bucket.to ?? "";
  if (!from || !to) return bucket.bucket;
  if (interval === "hour") return `${from.slice(0, 10)} ${from.slice(11, 16)} – ${to.slice(11, 16)}`;
  if (interval === "day") return from.slice(0, 10);
  return `${from.slice(0, 10)} – ${to.slice(0, 10)}`;
}

// The full range as one line, for the chart's caption.
export function windowCaption(from: string, to: string, interval: UsageInterval): string {
  if (interval === "hour") return `${from.slice(0, 16)} — ${to.slice(0, 16)}`;
  return `${from.slice(0, 10)} — ${to.slice(0, 10)}`;
}
