"use client";

import { useRouter } from "next/navigation";
import { markNotificationRead } from "@/modules/notifications/actions/notification-actions";
import { NotificationRow } from "@/modules/notifications/components/notification-row";
import type { AppNotification } from "@/types/notification";

// A full-page row that marks itself read when clicked — reading IS the
// dismissal, on this page as in the panel. Its own client leaf so the list
// stays a Server Component.
//
// The refresh afterwards is what re-renders the row styling, the unread tab
// count and the header badge from the server, so they all agree. For a linked
// row navigation is already underway; refreshing the destination's tree keeps
// the header right there too.
export function ReadOnClickRow({ notification }: { notification: AppNotification }) {
  const router = useRouter();

  return (
    <NotificationRow
      notification={notification}
      onActivate={() => {
        if (notification.read_at !== null) return;
        void markNotificationRead(notification.id).then((result) => {
          if (result.ok) router.refresh();
        });
      }}
    />
  );
}
