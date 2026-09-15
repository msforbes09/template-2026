import { apiFetch } from "@/lib/api-client";
import { requireClientSession } from "@/lib/auth/dal";
import { logError } from "@/lib/log-error";
import type { NotificationPage } from "@/types/notification";

// The citizen's own notifications — GET user/notifications.
//
// Never cached, and never tagged: this is per-account, changes on every
// broadcast, and its meta carries the bell badge. A stale badge is worse than
// no badge.
//
// The bell renders on every authenticated page, so a failure here must not be
// able to take one down. Returns an empty page rather than throwing, which
// renders as a bell with no badge — the notifications are still reachable from
// their own page, and nothing else on the page is affected.

export const PANEL_PAGE_SIZE = 10;
export const LIST_PAGE_SIZE = 20;

const EMPTY: NotificationPage = {
  data: [],
  meta: { current_page: 1, per_page: 0, total: 0, unread_count: 0 },
};

export type NotificationQuery = {
  // Unread only. The API takes 1/0.
  unread?: boolean;
  // Exact type match, e.g. "review.created".
  type?: string;
  perPage?: number;
  page?: string | number;
};

export async function getNotifications(query: NotificationQuery = {}): Promise<NotificationPage> {
  await requireClientSession();

  const params = new URLSearchParams();
  if (query.unread) params.set("unread", "1");
  if (query.type) params.set("type", query.type);
  // Capped at 50 by the API; asking for more is a 422 rather than a clamp.
  params.set("per_page", String(Math.min(query.perPage ?? PANEL_PAGE_SIZE, 50)));
  params.set("page", String(query.page ?? 1));

  try {
    return await apiFetch<NotificationPage>(
      `/notifications?${params.toString()}`,
      { cache: "no-store" },
      "client",
    );
  } catch (err) {
    // Reported, not swallowed silently — but not rethrown either.
    void logError(err, { where: "getNotifications", audience: "client" });
    return EMPTY;
  }
}
