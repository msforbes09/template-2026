import { formatDate } from "@/lib/format-date";
import type { EgovEvent } from "@/types/project";

// When an event runs, as one readable line.
//
// Shared by the showcase page and the landing band so the two never disagree
// about a date — they read the same event object from the same cached list.
//
// Every datetime is `Y-m-d H:i:s` in Asia/Manila, never ISO-8601. Parsing one
// without an offset yields a local-time Date and formatting reads it back in
// the same zone, so the wall-clock survives the round trip whatever zone the
// server runs in. That is the only reason Date is safe here.

// A one-day event says its hours; a multi-day one says its days. Showing
// "29 Jul 2026 – 29 Jul 2026" for a single-day hackathon is noise, and showing
// only the date hides the thing an entrant actually needs.
//
// The same-day test slices the date half of the string rather than parsing
// both ends, so it cannot be thrown off by a zone or a DST boundary.
export function eventDateRange(event: EgovEvent): string | null {
  if (!event.starts_at) return null;

  const from = formatDate(event.starts_at, "d MMM yyyy");
  if (from === "—") return null;

  const sameDay =
    !!event.ends_at && event.ends_at.slice(0, 10) === event.starts_at.slice(0, 10);

  if (sameDay) {
    const opens = formatDate(event.starts_at, "h:mm a", "");
    const closes = formatDate(event.ends_at, "h:mm a", "");
    return opens && closes ? `${from} · ${opens} – ${closes}` : from;
  }

  const to = event.ends_at ? formatDate(event.ends_at, "d MMM yyyy", "") : "";
  return to ? `${from} – ${to}` : from;
}
