import "server-only";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { requireAdminSession, requireClientSession } from "@/lib/auth/dal";
import { safeErrorMessage } from "@/lib/safe-error-message";
import { usageQueryString, type UsageQuery } from "@/modules/gateway-usage/lib/usage-window";
import type { AdminUsageDashboard, UsageDashboard } from "@/types/gateway-usage";

// The usage dashboard reads. Aggregated and historical, so `cache: "no-store"`
// rather than a tag: the numbers move with every gateway call and there is no
// write on this surface to revalidate against.

export type UsageResult<T> =
  | { ok: true; data: T }
  // `forbidden` is its own outcome: an admin without `dashboard-view` is a
  // normal state to render as "you don't have access", not a failed load.
  | { ok: false; forbidden: true; unavailable?: false; message: string }
  // `unavailable` too: the API answers 503 when its analytics store is down
  // (there is deliberately no fallback), which is a temporary condition to
  // wait out — not something broken on the caller's side.
  | { ok: false; forbidden: false; unavailable?: boolean; message: string };

function toResult<T>(err: unknown, fallback: string): UsageResult<T> {
  if (isApiError(err) && err.status === 403) {
    return {
      ok: false,
      forbidden: true,
      message: "You don't have permission to view the usage dashboard.",
    };
  }
  if (isApiError(err) && err.status === 503) {
    return {
      ok: false,
      forbidden: false,
      unavailable: true,
      message: "Usage analytics are temporarily unavailable — try again shortly.",
    };
  }
  return { ok: false, forbidden: false, message: safeErrorMessage(err, fallback) };
}

// The citizen's own usage. A basic account is not an error here — the API
// answers with zeros rather than 403, which is why there is no account gate:
// an empty dashboard is the honest answer for someone who has made no calls.
export async function getClientUsageDashboard(
  query: UsageQuery,
): Promise<UsageResult<UsageDashboard>> {
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: UsageDashboard }>(
      `/dashboard/gateway-api-usage?${usageQueryString(query)}`,
      { cache: "no-store" },
      "client",
    );
    return { ok: true, data };
  } catch (err) {
    return toResult(err, "Something went wrong loading your API usage.");
  }
}

// Platform-wide, or one developer's own breakdown when `userUuid` is given.
//
// With a uuid the API keeps the admin per-catalog shape (partner latency +
// 5xx per row) scoped to that developer, and only omits the rankings — which is
// why the return type is the admin one with that extra optional rather than
// two calls with different types.
export async function getAdminUsageDashboard(
  query: UsageQuery,
  userUuid?: string,
): Promise<UsageResult<AdminUsageDashboard>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminUsageDashboard }>(
      `/dashboard/gateway-api-usage?${usageQueryString(
        query,
        userUuid ? { user_uuid: userUuid } : undefined,
      )}`,
      { cache: "no-store" },
      "admin",
    );
    return { ok: true, data };
  } catch (err) {
    // An unknown uuid is a 404 and reads better as "no such developer" than as
    // a generic failure.
    if (isApiError(err) && err.status === 404 && userUuid) {
      return {
        ok: false,
        forbidden: false,
        message: "That developer no longer exists, or has no usage to show.",
      };
    }
    return toResult(err, "Something went wrong loading the usage dashboard.");
  }
}
