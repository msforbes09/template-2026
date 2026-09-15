// Admin broadcasts — an announcement pushed into users' notification bells.
// The receiving side is the `announcement` notification type
// (types/notification.ts).

// draft -> sending -> sent.
//
// Creating does NOT deliver. A broadcast is composed as a draft and then
// explicitly started; from `sending` on it is immutable history and cannot be
// recalled.
export type BroadcastStatus = "draft" | "sending" | "sent";

// Which users a broadcast targets.
//
// NULL means every registered user — the absence of targeting, not an empty
// object. `user_uuid` is exclusive of `status` (the API answers 422 if they
// are sent together).
export type BroadcastFilters = {
  status?: "draft" | "completed";
  user_uuid?: string;
} | null;

export type AdminBroadcast = {
  id: number;
  status: BroadcastStatus;
  title: string;
  // Plain text. Users see it verbatim in the bell — never rendered as
  // markdown or HTML on either side.
  body: string;
  filters: BroadcastFilters;
  // Null until the fan-out finishes. A row that is `sending` with a null
  // count is normal for a few seconds; minutes means the queue is stuck.
  recipients_count: number | null;
  // All three are `Y-m-d H:i:s` server wall-clock — render as-is, never
  // re-shift into another zone.
  started_at: string | null;
  completed_at: string | null;
  administrator: { id: number; name: string };
  created_at: string;
};

// Only a draft can be edited, deleted or started — and only by whoever created
// it. The API enforces both (400 invalid_status / 403 broadcast_not_owned);
// these decide whether the control is worth rendering.
export function isBroadcastEditable(broadcast: AdminBroadcast): boolean {
  return broadcast.status === "draft";
}

export function isBroadcastOwner(
  broadcast: AdminBroadcast,
  adminId: number | null | undefined,
): boolean {
  return adminId !== null && adminId !== undefined && broadcast.administrator.id === adminId;
}

// A fan-out that has been "sending" for this long is not slow, it is stuck —
// the job failed or is queued behind something. Surfaced as a hint to check
// the queue rather than as an error, because the broadcast itself is fine.
export const BROADCAST_STUCK_AFTER_MS = 5 * 60_000;
