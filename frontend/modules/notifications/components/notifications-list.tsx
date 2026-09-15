import Link from "next/link";
import { BellOff } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReadOnClickRow } from "@/modules/notifications/components/read-on-click-row";
import { MarkAllReadButton } from "@/modules/notifications/components/mark-all-read-button";
import { NotificationsLiveRefresh } from "@/modules/notifications/components/notifications-live-refresh";
import { getNotifications, LIST_PAGE_SIZE } from "@/modules/notifications/lib/get-notifications";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { notificationPaginationMeta } from "@/types/notification";

// The full notification history — "view all" from the bell.
//
// Server-rendered and paginated, unlike the panel: this is where someone goes
// to read rather than to glance, so it is a plain list with the filter in the
// URL. Clicking a row marks it read here too — reading is the dismissal on
// both surfaces, and a badge that survives the reader visiting this page
// reads as a bug. "Mark all as read" clears the rest in one go.
//
// Retention is 12 months, server-side and automatic. There is no archive UX
// because there is nothing to archive — old rows simply stop being returned.

export async function NotificationsList({
  unread,
  type,
  page,
}: {
  unread: boolean;
  type: string;
  page: string;
}) {
  const [result, profile] = await Promise.all([
    getNotifications({
      unread,
      type: type || undefined,
      perPage: LIST_PAGE_SIZE,
      page,
    }),
    // Names the citizen's private channel for the live refresh below;
    // cache()-memoized, so the header's bell already paid for this read.
    getClientProfile(),
  ]);

  const { data, meta } = result;

  return (
    <div className="flex flex-col gap-5">
      {/* New arrivals re-fetch this page live, as they already reach the
          bell — see the component for why refresh beats patching state. */}
      <NotificationsLiveRefresh channel={profile?.uuid ? `user.${profile.uuid}` : null} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* URL-backed, so a filtered view is shareable and the back button
            behaves. Links rather than buttons: each is a real address. */}
        <div
          role="group"
          aria-label="Filter notifications"
          className="flex flex-wrap gap-1 rounded-lg border border-border p-1"
        >
          {[
            { label: "All", href: "/dashboard/notifications", active: !unread },
            {
              label: `Unread${meta.unread_count ? ` (${meta.unread_count})` : ""}`,
              href: "/dashboard/notifications?unread=1",
              active: unread,
            },
          ].map((view) => (
            <Button
              key={view.href}
              variant="ghost"
              size="sm"
              nativeButton={false}
              className={cn(
                "px-4",
                view.active && "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
              render={<Link href={view.href} aria-current={view.active ? "page" : undefined} />}
            >
              {view.label}
            </Button>
          ))}
        </div>

        {meta.unread_count > 0 && <MarkAllReadButton />}
      </div>

      {data.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={unread ? "Nothing unread" : "No notifications yet"}
          description={
            unread
              ? "You're all caught up."
              : "Reviews, approvals and credit warnings will appear here."
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-1 rounded-xl border border-border p-1.5">
            {data.map((notification) => (
              <li key={notification.id}>
                <ReadOnClickRow notification={notification} />
              </li>
            ))}
          </ul>
          <PaginationBar meta={notificationPaginationMeta(meta)} noun="notification" />
        </>
      )}
    </div>
  );
}
