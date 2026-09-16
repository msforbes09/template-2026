// The idle-session timer's schedule, derived from the backend's sliding
// inactivity window (`session_inactivity_minutes` on either profile).
//
// Counted from the moment the profile was read rather than from the server's
// `token_expires_at` string on purpose: that timestamp is in the API's
// timezone and parsing it against the browser clock would drift by the
// offset, whereas "N minutes from this render" is what the server actually
// promised. The few hundred milliseconds between the fetch and the mount are
// on the safe side — the client warns marginally early, never late.
export type IdleSchedule = { warnAfterMs: number; expireAfterMs: number };

export function idleSchedule(
  windowMinutes: number | undefined,
  warningSeconds: number,
): IdleSchedule | null {
  if (!windowMinutes || !Number.isFinite(windowMinutes) || windowMinutes <= 0) return null;
  const expireAfterMs = Math.round(windowMinutes * 60_000);
  return { warnAfterMs: Math.max(0, expireAfterMs - warningSeconds * 1_000), expireAfterMs };
}
