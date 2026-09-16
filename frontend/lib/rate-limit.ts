import "server-only";

// A crude in-memory fixed-window limiter for unauthenticated server entry
// points (today: the reportError server action).
//
// Per-process, so behind more than one instance each gets its own budget;
// a shared store is the fix if that ever matters. Keyed on a caller string
// derived from the session or the edge-provided client IP (lib/client-ip.ts).

const WINDOW_MS = 60_000;

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
