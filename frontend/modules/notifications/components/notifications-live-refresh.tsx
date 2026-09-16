"use client";

import { useRouter } from "next/navigation";
import { useNotificationStream } from "@/modules/notifications/lib/use-notification-stream";

// Keeps the server-rendered notifications page current while it is open.
//
// The bell already receives new notifications live; this page did not — a row
// arriving while the reader sat on it appeared in the panel but not in the
// list underneath, which reads as the page being broken. Renders nothing:
// on each arrival it re-fetches the server list, so the new row, the unread
// tab count and the pagination meta all update from one source of truth
// instead of being patched client-side.
//
// Shares getEcho's per-audience connection with the bell, so subscribing here
// costs no second socket.
export function NotificationsLiveRefresh({ channel }: { channel: string | null }) {
  const router = useRouter();

  useNotificationStream({
    channel,
    onCreated: () => router.refresh(),
  });

  return null;
}
