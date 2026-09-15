import { NotificationRow } from "@/modules/notifications/components/notification-row";
import type { AppNotification } from "@/types/notification";

// What the user will actually see.
//
// Renders through the SAME component their bell uses rather than a lookalike,
// so this is not an approximation — the icon, the tone, the clamp and the
// wording all come from notificationContent exactly as they will in
// production. If the announcement rendering changes, this changes with it and
// cannot drift into a comforting lie.
//
// The row is shown unread, because that is the state it arrives in.
export function BroadcastPreview({ title, body }: { title: string; body: string }) {
  const preview: AppNotification = {
    id: 0,
    type: "announcement",
    // Mirrors the server's rendering rule for announcements: title/message
    // are the admin-authored text passed through verbatim (empty body → no
    // second line, exactly as NotificationCopy sends null).
    title: title.trim(),
    message: body.trim() || null,
    data: { reference: null, title: title.trim(), body: body.trim() },
    read_at: null,
    // Fixed rather than "now": a preview that ticks while you type draws the
    // eye to the one part of it that is not the message.
    created_at: "2026-01-01 09:00:00",
  };

  return (
    <div className="rounded-xl border border-border bg-card p-1.5">
      <NotificationRow notification={preview} />
    </div>
  );
}
