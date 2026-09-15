"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/modules/notifications/actions/notification-actions";
import { NotificationDetailDialog } from "@/modules/notifications/components/notification-detail-dialog";
import { NotificationRow } from "@/modules/notifications/components/notification-row";
import { notificationContent } from "@/modules/notifications/lib/notification-content";
import { useNotificationStream } from "@/modules/notifications/lib/use-notification-stream";
import type { AppNotification, NotificationPage } from "@/types/notification";

// The bell, its badge, and the panel behind it.
//
// The first page and the badge are fetched on the SERVER and handed in, so the
// badge is correct on first paint rather than popping in after a client fetch.
// From then on this component owns the state: the socket adds to it, and
// marking read subtracts from it.
//
// The badge counts the WHOLE ACCOUNT (meta.unread_count), not the rows in the
// panel — which is why it is tracked as its own number rather than derived
// from `items`.

// Anything past this and the panel becomes a scroll container pretending to be
// a list. The full page is one click away.
const PANEL_ROWS = 10;

// 99+ rather than a badge wide enough to break the header.
function badgeLabel(count: number): string {
  return count > 99 ? "99+" : String(count);
}

export function NotificationBell({
  initial,
  channel,
}: {
  initial: NotificationPage;
  // `user.{uuid}`, or null when the uuid could not be read — in which case
  // the bell still works, it just will not update until the next page load.
  channel: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>(initial.data);
  const [unread, setUnread] = useState(initial.meta.unread_count);
  // A link-less row's full text, shown OUTSIDE the popover: the dialog
  // portals past the popover's DOM, so rendered inside it, every click in
  // the dialog would count as an outside click and close both.
  const [detail, setDetail] = useState<AppNotification | null>(null);
  const [isPending, startTransition] = useTransition();

  // Re-adopt the server's answer whenever it re-renders — a router.refresh()
  // after marking rows read elsewhere (the full page's rows, its "mark all")
  // hands in a fresh `initial`, and without this the badge would keep the
  // count it was mounted with for the rest of the visit. Done during render
  // (the derive-state-from-a-prop-change pattern) rather than in an effect,
  // so the stale badge never paints.
  const [adopted, setAdopted] = useState(initial);
  if (adopted !== initial) {
    setAdopted(initial);
    setItems(initial.data);
    setUnread(initial.meta.unread_count);
  }

  useNotificationStream({
    channel,
    onCreated: (incoming) => {
      setItems((current) => {
        // The socket can replay on reconnect, and an optimistic path could
        // race it. Keyed by id so a duplicate replaces rather than doubles.
        const withoutDuplicate = current.filter((item) => item.id !== incoming.id);
        return [incoming, ...withoutDuplicate].slice(0, PANEL_ROWS);
      });
      setUnread((count) => count + 1);

      // Only the delightful ones interrupt. Sanctions and security land in
      // the panel, where they can be read properly rather than skimmed as a
      // toast that disappears.
      const content = notificationContent(incoming);
      if (content.toast) {
        toast.success(content.title, { description: content.body ?? undefined });
      }
    },
  });

  function handleActivate(notification: AppNotification) {
    if (notification.read_at !== null) return;

    // Optimistic: the row is already navigating, so waiting on the round trip
    // would show a stale unread state on a page the reader has left.
    setItems((current) =>
      current.map((item) =>
        item.id === notification.id
          ? { ...item, read_at: new Date().toISOString() }
          : item,
      ),
    );
    setUnread((count) => Math.max(0, count - 1));

    void markNotificationRead(notification.id).then((result) => {
      if (!result.ok) {
        // Put it back rather than leave a badge that disagrees with the
        // server. A 404 here means someone else's id or a pruned row.
        setItems((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, read_at: null } : item,
          ),
        );
        setUnread((count) => count + 1);
      }
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const now = new Date().toISOString();
      setItems((current) =>
        current.map((item) => (item.read_at ? item : { ...item, read_at: now })),
      );
      setUnread(0);
      // The full list page, if the reader is on it, is server-rendered.
      router.refresh();
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={
              unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
            }
          >
            <Bell aria-hidden />
            {unread > 0 && (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground"
              >
                {badgeLabel(unread)}
              </span>
            )}
          </Button>
        }
      />

      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={handleMarkAll}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : (
                <CheckCheck aria-hidden />
              )}
              Mark all as read
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            Nothing yet. We&apos;ll let you know when something happens.
          </p>
        ) : (
          <ul className="max-h-[26rem] overflow-y-auto p-1.5">
            {items.map((notification) => (
              <li key={notification.id}>
                <NotificationRow
                  notification={notification}
                  onActivate={() => {
                    handleActivate(notification);
                    setOpen(false);
                  }}
                  onShowDetail={() => setDetail(notification)}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-border p-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            nativeButton={false}
            render={<Link href="/dashboard/notifications" onClick={() => setOpen(false)} />}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>

      {detail && (
        <NotificationDetailDialog
          notification={detail}
          open
          onOpenChange={(next) => {
            if (!next) setDetail(null);
          }}
        />
      )}
    </Popover>
  );
}
