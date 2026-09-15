"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format-date";
import { notificationContent } from "@/modules/notifications/lib/notification-content";
import type { AppNotification } from "@/types/notification";

// The full text behind a link-less notification — an announcement, a deleted
// project. The listing clamps the message, and with no page to navigate to,
// this dialog is the only place a long announcement can be read to the end.
//
// One component for both surfaces: the full page's rows open it themselves,
// while the bell hoists it OUTSIDE the popover — the dialog portals past the
// popover's DOM, so from inside it every click would count as an outside
// click, close the panel and unmount the dialog mid-read.
export function NotificationDetailDialog({
  notification,
  open,
  onOpenChange,
}: {
  notification: AppNotification;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const content = notificationContent(notification);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>
            {formatDate(notification.created_at, "d MMM yyyy, h:mm a")}
          </DialogDescription>
        </DialogHeader>
        {content.body && (
          <p className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {content.body}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
