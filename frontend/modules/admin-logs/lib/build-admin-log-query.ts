// Query builder shared by every admin log list (gateway, connection,
// auth-attempt, audit). They all take the same paging + date-range params and
// differ only in their per-type term filters, so those come in as a plain
// record rather than each list hand-rolling its own URLSearchParams.
//
// The date range spans months — these endpoints read from OpenSearch and are
// no longer month-scoped, which is why there's no `month` here. The citizen's
// own list moved onto the same footing (2026-08-17 handoff) and keeps its own
// builder for its own per-page constant — see
// modules/gateway-logs/lib/build-log-query.ts.

import { isValidLogDate } from "@/lib/log-date";

// Re-exported so the admin lists that already import it from here keep working.
export { isValidLogDate };

// Server-side cap is 100; 20 is the API default and matches the other lists.
export const ADMIN_LOGS_PER_PAGE = 20;

export function buildAdminLogQuery({
  filters = {},
  from,
  to,
  page,
  perPage = ADMIN_LOGS_PER_PAGE,
}: {
  // Per-type term filters — platform, or type + status_code, or guard +
  // event, etc. Empty and nullish values are dropped so an "all" selection
  // doesn't narrow the query to the empty string.
  filters?: Record<string, string | null | undefined>;
  from?: string;
  to?: string;
  page?: string;
  perPage?: number;
}): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  if (isValidLogDate(from)) params.set("from", from);
  if (isValidLogDate(to)) params.set("to", to);

  params.set("page", String(Number(page) || 1));
  params.set("per_page", String(perPage));
  return params.toString();
}
