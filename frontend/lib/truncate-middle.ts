const ELLIPSIS = "…";

// Shortens a long string by eliding its middle, keeping the head and tail.
// Callers should still expose the full value (e.g. via `title`).
export function truncateMiddle(value: string, max = 50): string {
  if (value.length <= max) return value;

  const url = parseUrl(value);
  if (url) {
    const budget = max - url.origin.length - ELLIPSIS.length;
    // Only worth being URL-aware if the origin leaves meaningful room for the
    // path; a huge host is better served by the generic split below.
    if (budget >= 8) {
      const rest = value.slice(url.origin.length);
      let tail = rest.slice(-budget);
      // Snap to a path-segment boundary when one falls inside the budget so
      // the tail reads "/…/resource" rather than "…ource".
      const slash = tail.indexOf("/");
      if (slash > 0) tail = tail.slice(slash);
      return `${url.origin}${ELLIPSIS}${tail}`;
    }
  }

  const room = Math.max(max - ELLIPSIS.length, 0);
  const head = Math.ceil(room / 2);
  const tail = room - head;
  return `${value.slice(0, head)}${ELLIPSIS}${tail > 0 ? value.slice(-tail) : ""}`;
}

function parseUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.origin === "null" ? null : url;
  } catch {
    return null;
  }
}
