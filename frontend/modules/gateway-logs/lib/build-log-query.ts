import { isValidLogDate } from "@/lib/log-date";

// Gateway-log lists cap `per_page` at 100 server-side; 20 is the API default
// and matches the other lists in this app.
export const GATEWAY_LOGS_PER_PAGE = 20;

// The query string for the citizen's own gateway-log list (GET
// /user/gateway-logs), shared by the usage page and the per-catalog usage tab.
//
// `month` is GONE, not optional: the endpoint moved onto OpenSearch and no
// longer accepts it (2026-08-17 handoff). A `from`/`to` range replaces it and
// spans months, so a window that used to take one call per month is now one
// call. Both ends are inclusive and validated before they're forwarded — a
// malformed date is a 422, and these come straight from the URL where anything
// can be typed, so an unparseable value is dropped and that side of the range
// stays open.
export function buildGatewayLogQuery({
  platform,
  statusCode,
  from,
  to,
  page,
}: {
  platform: string;
  // Exact-match HTTP status returned to the caller ("200", "502"). Optional —
  // the toolbar's free-text status filter.
  statusCode?: string;
  from?: string;
  to?: string;
  page: string;
}): string {
  const params = new URLSearchParams();
  if (platform) params.set("platform", platform);
  if (statusCode) params.set("status_code", statusCode);
  if (isValidLogDate(from)) params.set("from", from);
  if (isValidLogDate(to)) params.set("to", to);
  params.set("page", String(Number(page) || 1));
  params.set("per_page", String(GATEWAY_LOGS_PER_PAGE));
  return params.toString();
}
