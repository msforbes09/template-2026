import "server-only";

// A crude fixed-window limiter for /api/chat.
//
// It exists because the chat endpoint is reachable without a session (a
// deliberate product decision) and every request bills real Vertex tokens —
// so it needs *some* floor under abuse. It is not a security control:
//
// - In-memory, so it's per-process. Behind more than one instance each gets
//   its own budget. Fine for the current single-container deploy; a shared
//   store would be the fix if that changes.
// - Keyed on a caller string the route derives from the session or the client
//   IP. That IP now comes from lib/client-ip.ts, which reads only headers the
//   trusted edge sets — it used to be x-forwarded-for.split(",")[0], which a
//   caller supplies, so a fresh random value per request bought a fresh bucket
//   and the ceiling did not exist at all.
//
// If chat volume ever matters commercially, replace this with a real limiter
// rather than tuning the numbers.

const WINDOW_MS = 60_000;

// Counted per USER TURN, not per HTTP request — see the note in route.ts. That
// distinction is what makes these numbers usable: one thing the user does can
// be five or six POSTs once tool round-trips are counted, and the first cut of
// this limiter throttled a single test flow after one attempt.
const MAX_SIGNED_IN = 30;
const MAX_ANONYMOUS = 10;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Hard ceiling on distinct buckets, enforced independently of expiry.
//
// The previous sweep only deleted ALREADY-EXPIRED entries and only ran above
// 5 000, so a burst of unique keys inside a single 60s window grew the map
// without bound — every entry was still live, so there was nothing to collect.
// Eviction now falls back to dropping oldest-first (Map preserves insertion
// order) so the map is bounded whatever the traffic shape.
const MAX_BUCKETS = 10_000;

function sweep(now: number) {
  if (buckets.size < 5_000) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  // Still over after collecting the expired ones: evict oldest-first until
  // under the cap. Evicting a live bucket forgives that caller's count, which
  // is the correct trade — a bounded limiter that occasionally under-counts
  // beats an unbounded map that can exhaust the process.
  if (buckets.size <= MAX_BUCKETS) return;
  const excess = buckets.size - MAX_BUCKETS;
  let dropped = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    if (++dropped >= excess) break;
  }
}

export function checkRateLimit(
  key: string,
  { signedIn }: { signedIn: boolean },
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  sweep(now);

  const limit = signedIn ? MAX_SIGNED_IN : MAX_ANONYMOUS;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true };
}
