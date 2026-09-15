import type { UsageInterval } from "@/types/gateway-usage";

// Reading and building the usage dashboard's window, from the URL to the API
// query. Pure, so the rules the API enforces are testable here rather than
// discovered as a 422 in the browser.

export const USAGE_INTERVALS = ["hour", "day", "week"] as const;
// Daily by default (2026-08-31): dashboards open on the 30-day trend. The
// trade accepted with it: the daily window excludes the in-progress day, so
// nothing newer than yesterday shows on open — today's traffic lives in the
// live trace. The API's own no-param default stays `hour`; the FE always
// sends interval explicitly, so this is a FE-only choice.
export const DEFAULT_USAGE_INTERVAL: UsageInterval = "day";

// What each interval means when sent on its own, and the cap a CUSTOM range
// may not exceed. They are the same number by design — a custom window can't
// be longer than the matching preset's span.
export const INTERVAL_PRESET: Record<UsageInterval, { label: string; span: string; maxUnits: number }> = {
  hour: { label: "24 hours", span: "Last 24 complete hours", maxUnits: 24 },
  day: { label: "30 days", span: "Last 30 complete days", maxUnits: 30 },
  week: { label: "8 weeks", span: "Last 8 complete weeks", maxUnits: 8 },
};

export function resolveInterval(raw: string | null | undefined): UsageInterval {
  return USAGE_INTERVALS.find((i) => i === raw) ?? DEFAULT_USAGE_INTERVAL;
}

// The input format the API demands depends on the interval: `YYYY-MM-DD HH:mm`
// for hour, `YYYY-MM-DD` for day and week. Sending the wrong one is a 422, so
// this is checked before the request rather than after.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

export function isValidWindowInput(value: string, interval: UsageInterval): boolean {
  return interval === "hour" ? DATE_TIME.test(value) : DATE_ONLY.test(value);
}

export type UsageQueryInput = {
  interval?: string | null;
  from?: string | null;
  to?: string | null;
  platform?: string | null;
};

export type UsageQuery = {
  interval: UsageInterval;
  // Present only when a valid, complete custom range was given.
  from?: string;
  to?: string;
  platform?: string;
  // Why a requested custom range was dropped, for telling the reader rather
  // than silently showing them the preset instead.
  rejected?: "incomplete" | "format";
};

// Turns URL params into the query the API accepts.
//
// A custom range is DROPPED rather than forwarded when it cannot be valid:
// `from` and `to` must be sent together (either alone is a 422) and each must
// match the interval's format. Falling back to the preset keeps a hand-edited
// or stale URL rendering a dashboard instead of an error — but `rejected` says
// which happened, so the UI can say so rather than pretending it was asked for.
export function buildUsageQuery(input: UsageQueryInput): UsageQuery {
  const interval = resolveInterval(input.interval);
  const platform = input.platform?.trim() || undefined;
  const from = input.from?.trim();
  const to = input.to?.trim();

  if (!from && !to) return { interval, ...(platform ? { platform } : {}) };

  if (!from || !to) {
    return { interval, ...(platform ? { platform } : {}), rejected: "incomplete" };
  }

  if (!isValidWindowInput(from, interval) || !isValidWindowInput(to, interval)) {
    return { interval, ...(platform ? { platform } : {}), rejected: "format" };
  }

  return { interval, from, to, ...(platform ? { platform } : {}) };
}

// The query string, with `interval` always sent explicitly. The API defaults to
// hour on its own and to day alongside from/to — two different defaults, so
// leaving it off would silently change granularity the moment a custom range
// is added.
export function usageQueryString(query: UsageQuery, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ interval: query.interval });
  if (query.from && query.to) {
    params.set("from", query.from);
    params.set("to", query.to);
  }
  if (query.platform) params.set("platform", query.platform);
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

// The dashboard's OWN url filtered to one platform — rows filter the
// dashboard in place; only the View logs link leaves it. `null` clears the
// filter. The window and the drilled developer survive either way, so the
// numbers a reader just narrowed stay the numbers they see next. `basePath`
// defaults to the admin dashboard; the citizen dashboard passes its own.
export function platformFilterHref(
  query: UsageQuery,
  platform: string | null,
  userUuid?: string,
  basePath = "/admin",
): string {
  return `${basePath}?${usageQueryString(
    { ...query, platform: platform ?? undefined },
    userUuid ? { user_uuid: userUuid } : undefined,
  )}`;
}
