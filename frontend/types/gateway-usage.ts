// The gateway API usage dashboard — GET {user|administrator}/dashboard/
// gateway-api-usage. Read-only aggregates over the same gateway logs the list
// views show, per the 2026-08-26 handoff.
//
// Historical and polled, NOT real-time: the current in-progress period is
// always excluded, so "now" never appears as a misleadingly short bar. Pair it
// with the `gateway.log` Reverb broadcast for a live view.

// Bucket granularity. Also selects the default span when sent alone —
// hour → last 24h, day → last 30d, week → last 8w. The API's own no-param
// default is hour; the FE default is DAY (usage-window.ts) and always sent
// explicitly.
export type UsageInterval = "hour" | "day" | "week";

// Every datetime is `Y-m-d H:i:s` in Asia/Manila, never ISO-8601.
export type UsageWindow = {
  from: string;
  to: string;
  interval: UsageInterval;
};

// Milliseconds. ANY field is null when the window held no timed calls, so
// every read has to tolerate it — a dashboard that renders `null` as 0 claims
// a fast response where there was no response at all.
//
// On `totals` and `by_catalog.latency` this is total gateway handling time —
// sampled only from calls that reached the partner, so gateway-side
// rejections never drag it down; `by_catalog.partner_latency` (admin only)
// is the partner round-trip.
export type UsageLatency = {
  avg: number | null;
  p50: number | null;
  p95: number | null;
  p99: number | null;
};

export type UsageTotals = {
  calls: number;
  success: number;
  errors: number;
  // 0..1, not a percentage.
  success_rate: number;
  latency: UsageLatency;
};

// The immediately preceding window of the same length — the frontend computes
// the deltas. `by_catalog` (2026-08-31) carries that window's per-catalog rows
// in the same shape as the top-level array, joined by platform for the table's
// per-column deltas; a platform absent there made no calls in that window.
export type UsagePrevious = {
  window: { from: string; to: string };
  totals: UsageTotals;
  by_catalog?: UsageByCatalog[];
};

// Zero-filled to the full window: every bucket is present even at 0 calls, so
// the axis is continuous and the array length is the bucket count. `to` is the
// INCLUSIVE last second of the bucket.
//
// `bucket` is the label and its format follows the interval — `Y-m-d H:00`,
// `Y-m-d`, or calendar-year + ISO week (`2026-W35`). Treat it as opaque and
// format from `from` instead where a nicer label is wanted.
export type UsageBucket = {
  bucket: string;
  from: string;
  to: string;
  calls: number;
  errors: number;
};

// One row per API catalog. Deliberately no credits: the allowance lives on the
// profile endpoint (the BE dropped `credits` from the payload on 2026-08-31).
export type UsageByCatalog = {
  platform: string;
  calls: number;
  errors: number;
  latency: UsageLatency;
  // ADMIN audiences only (platform-wide and single-user drill alike): the
  // partner's own round-trip latency, the 5xx count, and its share (0..1)
  // for this API. The citizen shape never carries any of these — citizens
  // must not learn upstream timings exist.
  partner_latency?: UsageLatency;
  errors_5xx?: number;
  error_rate_5xx?: number;
};

// Counts by status class. `errors` in totals is calls − (2xx + 3xx), so a null
// or odd status counts as an error without landing in any class here — the
// classes can therefore sum to less than `calls`.
export type UsageByStatus = {
  "2xx": number;
  "3xx": number;
  "4xx": number;
  "5xx": number;
};

// The most frequent 4xx/5xx codes in the window, descending, up to 10. Empty
// when nothing failed. `status_code` is a string, not a number.
export type UsageTopError = {
  status_code: string;
  count: number;
};

// Admin platform-wide only: the top 10 developers by call volume. `user_uuid`
// drills into their own breakdown via ?user_uuid=.
export type UsageTopUser = {
  user_uuid: string;
  display_name: string | null;
  calls: number;
  errors: number;
  // The API this developer called most in the window. Optional until the
  // backend change ships; null when the user has no platform rows.
  top_platform?: string | null;
};

// What both audiences always return.
export type UsageDashboard = {
  window: UsageWindow;
  generated_at: string;
  totals: UsageTotals;
  previous: UsagePrevious | null;
  by_bucket: UsageBucket[];
  by_catalog: UsageByCatalog[];
  by_status: UsageByStatus;
  top_errors: UsageTopError[];
};

// The admin shape: by_catalog rows carry partner_latency + error_rate_5xx on
// the platform-wide view AND the single-user drill (the old separate
// partner_health array is gone). Only the developer rankings are
// platform-wide-only — hence optional rather than two unrelated types.
export type AdminUsageDashboard = UsageDashboard & {
  top_user_by_calls?: UsageTopUser[];
  // Same row shape, ranked by ERROR count instead of calls; a zero-error
  // developer is never listed, so an empty array means a clean window.
  top_user_by_errors?: UsageTopUser[];
};
