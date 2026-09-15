// Gateway usage quota + gateway-log shapes.
//
// Credits meter partner-gateway calls (https://<host>/{partner}/{path}), not
// the /api/v1/* endpoints this frontend calls: one credit per completed
// partner round-trip. At zero the gateway rejects with 429 `quota_exceeded`
// before reaching the partner.
//
// ONE POOL PER API CATALOG since 2026-08-24 — this used to be a single shared
// balance. Pools are ISOLATED: running out on one partner no longer blocks the
// others, which is why nothing here aggregates them into a single number.

// How a pool's `used` behaves over time. `lifetime` only ever grows and a
// top-up ADDS to the allowance; `daily` resets `used` at midnight and a top-up
// SETS the allowance. Nullable because the API serialises `period?->value` —
// treat an absent period as lifetime (the conservative reading: no reset).
export type GatewayCreditPeriod = "lifetime" | "daily";

export type GatewayCreditPool = {
  // The partner slug — the same value as the API catalog `identifier` and the
  // gateway log's `platform`, which is what lets PlatformBadge colour them
  // consistently across usage, logs and credits.
  platform: string;
  allowance: number;
  used: number;
  remaining: number;
  period: GatewayCreditPeriod | null;
  // The coming midnight when a DAILY pool's `used` resets, `Y-m-d H:i:s` in
  // the app's timezone (never ISO-8601). Null on a lifetime pool, where only
  // an admin top-up clears an exhausted balance.
  resets_at: string | null;
};

// One entry per partner, in the backend's config order. Absent entirely for
// anything that is not an approved developer account.
export type GatewayCredits = GatewayCreditPool[];

// The minimal row shape returned by every gateway-log LIST endpoint —
// identical for the citizen and admin audiences (neither list carries
// `connection_duration_ms` or the caller's identity).
export type GatewayLogListItem = {
  // A composite, self-describing string — "{YYYY_MM}:{id}", e.g. "2026_08:42".
  // OPAQUE: never parse it, never coerce it to a number. It carries its own
  // month, which is why the show endpoints no longer take a `month` param —
  // pass this value through verbatim and the backend resolves the rest.
  id: string;
  // Partner slug; the same value as an API catalog's `identifier`.
  platform: string;
  method: string;
  // The request URI path only (e.g. "/emessage/messaging/v1/sms/push") —
  // no host, no query string.
  url: string;
  // A string in the API, not an int ("200"), and null when the call never
  // got a response (see `exception` on the detail).
  status_code: string | null;
  gateway_duration_ms: number | null;
  requested_at: string;
};

// The `gateway.log` broadcast payload (Reverb), pushed as each gateway call
// is logged — the list row exactly, plus the owning citizen's uuid. Arrives
// on the shared private `administrators` channel for admins and on private
// `user.{uuid}` for the citizen who made the call.
//
// `user_uuid` exists so the admin feed can be filtered client-side: there is
// one admin channel by design, and the per-user view is a filter on this
// field, not a separate subscription. It's null for the rare ownerless log.
//
// No detail fields (headers/params/payload/response/ip) — fetch the show
// endpoint for those.
export type GatewayLogEvent = GatewayLogListItem & {
  user_uuid: string | null;
};

// Body/header/param/response blobs are stored as JSON and already masked
// server-side; they can be an object or an array depending on what the
// partner returned, so they stay opaque and get rendered as formatted JSON.
export type GatewayLogBlob = Record<string, unknown> | unknown[] | null;

// The citizen's own detailed show (User API GET /gateway-logs/{id}).
// Deliberately omits `connection_duration_ms` and any caller identity.
export type GatewayLogDetail = GatewayLogListItem & {
  headers: GatewayLogBlob;
  params: GatewayLogBlob;
  payload: GatewayLogBlob;
  response: GatewayLogBlob;
  // A text column server-side — the failure message when the call never
  // completed, null otherwise.
  exception: string | null;
  ip_address: string | null;
};

// Masked caller identity on the admin detail — the display name is shown in
// full, email/mobile arrive partially masked from the API.
export type GatewayLogCaller = {
  uuid: string;
  display_name: string;
  email: string | null;
  mobile_number: string | null;
};

// The admin detailed show (Admin API GET /gateway-logs/{id} and
// GET /users/{uuid}/gateway-logs/{id}) — the citizen shape plus the partner
// round-trip and the masked caller. `user` is only present when the
// controller could resolve the caller, hence optional.
export type AdminGatewayLogDetail = GatewayLogDetail & {
  connection_duration_ms: number | null;
  user?: GatewayLogCaller | null;
};
