// The three non-gateway operational log types the admin console can read
// (2026-08-15 handoff). Gateway logs keep their own file — they're the one
// type the user audience also sees, and they carry a different shape.
//
// Shared conventions across all of them:
// - `id` is the composite "{YYYY_MM}:{id}" string. OPAQUE: never parse it,
//   never coerce it to a number. Pass it verbatim to the show endpoint,
//   which derives the month from it. See types/gateway-log.ts for the same
//   note on the gateway shapes.
// - Datetimes are plain "YYYY-MM-DD HH:mm:ss" strings — no timezone suffix,
//   not ISO-8601. lib/format-date.ts already parses that shape.
// - `status_code` is a STRING ("200"), nullable, not an int.
// - Durations are integers in milliseconds, nullable.
//
// Lists come from OpenSearch with a transparent MySQL fallback; the response
// is identical either way, so nothing here models that.

// Body/header/param/response blobs are stored as JSON and already masked
// server-side. They can be an object or an array depending on what the far
// end returned, so they stay opaque and render as formatted JSON — same
// treatment as GatewayLogBlob.
export type LogBlob = Record<string, unknown> | unknown[] | null;

// ── Connection logs — outbound calls WE make to partners ──────────────────

export type ConnectionLogListItem = {
  id: string;
  // The partner/connection slug, e.g. "emessage". Named `type` by the API,
  // not `platform` as on gateway logs.
  type: string;
  // Correlates the outbound call with whatever triggered it — the masked
  // mobile for an SMS provider. On the list
  // row since 2026-08-18; the API filters on it by exact match.
  reference: string | null;
  method: string;
  // The full outbound URL including host, unlike a gateway log's path-only url.
  url: string;
  status_code: string | null;
  duration_ms: number | null;
  requested_at: string;
};

export type ConnectionLogDetail = ConnectionLogListItem & {
  headers: LogBlob;
  params: LogBlob;
  payload: LogBlob;
  response: LogBlob;
  exception: string | null;
  ip_address: string | null;
  // Who caused the call, as a raw morph pair — there's no resolved/masked
  // caller object here the way gateway log details carry `user`.
  user_type: string | null;
  user_id: number | null;
};

// ── Auth-attempt logs — sign-in successes and failures ────────────────────

// Which guard the attempt was made against. The admin console and the
// user site authenticate separately, so this splits the two streams.
export type AuthGuard = "administrators" | "users";

export type AuthAttemptLogListItem = {
  id: string;
  guard: string;
  // e.g. "invalid_credentials", "login", "logout". Open-ended server-side, so
  // it stays a string rather than a union that would drift.
  event: string;
  user_type: string | null;
  user_id: number | null;
  ip_address: string | null;
  // Note: `attempted_at`, not `requested_at` like the other log types.
  attempted_at: string;
};

export type AuthAttemptLogDetail = AuthAttemptLogListItem & {
  // Partially masked, and only present for the administrators guard — the
  // raw identifier is never returned in full for either guard.
  identifier: string | null;
  // A hash of the identifier, for correlating attempts without revealing it.
  identifier_hash: string | null;
  user_agent: string | null;
};

// ── Audit logs — the change trail ─────────────────────────────────────────

export type AuditLogListItem = {
  id: string;
  // "created" | "updated" | "deleted" | … — open-ended server-side.
  event: string;
  // The model that changed, e.g. "User", "GatewayCredential".
  auditable_type: string | null;
  // A string in the API even though it's a numeric key server-side.
  auditable_id: string | null;
  user_type: string | null;
  user_id: number | null;
  tags: string | null;
  created_at: string;
};

export type AuditLogDetail = AuditLogListItem & {
  // The change set. Keys present in both are the fields that actually moved;
  // `created` carries only new_values and `deleted` only old_values.
  old_values: LogBlob;
  new_values: LogBlob;
  url: string | null;
  ip_address: string | null;
  user_agent: string | null;
  // Nullable on the detail shape even though the list's is not.
  created_at: string;
  updated_at: string | null;
};
