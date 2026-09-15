"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-date";
import { NotificationDetailDialog } from "@/modules/notifications/components/notification-detail-dialog";
import {
  notificationContent,
  type NotificationTone,
} from "@/modules/notifications/lib/notification-content";
import type { AppNotification } from "@/types/notification";

// One notification, in the panel or on the full list. Shared so a row cannot
// drift between the two surfaces.

// Tone drives the icon's colour only. The text stays in the normal ink: a
// whole row tinted red reads as an error state, and a suspension notice is
// information the reader has to be able to read comfortably, not an alarm.
const TONE_CLASS: Record<NotificationTone, string> = {
  positive: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  critical: "bg-destructive/10 text-destructive",
  security: "bg-primary/10 text-primary",
  neutral: "bg-muted text-muted-foreground",
};

export function NotificationRow({
  notification,
  onActivate,
  onShowDetail,
  className,
}: {
  notification: AppNotification;
  // Marks read before navigating. Omitted on a server-rendered list, where
  // the row is a plain link.
  onActivate?: () => void;
  // Takes over showing a link-less row's detail dialog. The bell passes this
  // to hoist the dialog outside its popover (see NotificationDetailDialog);
  // without it the row renders its own.
  onShowDetail?: () => void;
  className?: string;
}) {
  const content = notificationContent(notification);
  const Icon = content.icon;
  const unread = notification.read_at === null;
  // The detail dialog behind a link-less row — see below.
  const [detailOpen, setDetailOpen] = useState(false);

  const inner = (
    <>
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
          TONE_CLASS[content.tone],
        )}
      >
        <Icon aria-hidden className="size-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "text-sm leading-snug",
              unread ? "font-semibold text-foreground" : "text-foreground",
            )}
          >
            {content.title}
          </span>
          {/* Unread is stated as text for a screen reader, not left to the
              dot and the weight, both of which are colour and style alone. */}
          {unread && (
            <>
              <span className="sr-only">Unread</span>
              <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
            </>
          )}
        </span>

        {/* No `block` on the body: line-clamp-2 sets display:-webkit-box
            itself, and a competing display utility knocks the clamp out
            entirely — which is how long announcements rendered in full. */}
        {content.body && (
          <span className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {content.body}
          </span>
        )}

        <span className="mt-1 block text-xs text-muted-foreground/80">
          {formatDate(notification.created_at, "d MMM yyyy, h:mm a")}
        </span>
      </span>
    </>
  );

  const interactive = Boolean(content.href || onActivate);
  const shell = cn(
    "flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors",
    unread ? "bg-primary/5" : "",
    interactive ? "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50" : "",
    className,
  );

  // Nowhere to go — an announcement, a deleted project. The listing clamps
  // the message, so a click here opens the FULL detail in a dialog (there is
  // no page to navigate to) and marks the row read via onActivate: reading
  // is the dismissal, and without the dialog a long announcement could never
  // be read to the end at all. No handler (the broadcast compose preview)
  // means an inert row, as before.
  if (!content.href) {
    if (!onActivate) {
      return <div className={cn(shell, "cursor-default")}>{inner}</div>;
    }
    return (
      <>
        <button
          type="button"
          onClick={() => {
            if (onShowDetail) {
              onShowDetail();
            } else {
              setDetailOpen(true);
            }
            onActivate();
          }}
          className={shell}
        >
          {inner}
        </button>
        {!onShowDetail && (
          <NotificationDetailDialog
            notification={notification}
            open={detailOpen}
            onOpenChange={setDetailOpen}
          />
        )}
      </>
    );
  }

  return (
    <Link href={content.href} onClick={onActivate} className={shell}>
      {inner}
    </Link>
  );
}
