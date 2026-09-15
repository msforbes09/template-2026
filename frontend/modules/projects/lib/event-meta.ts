// The event's free-form `meta`, rendered without assuming what is in it.
//
// The type is explicit that meta is "free-form and public (venue, prizes,
// links) — render what is there; do not assume keys", and the 2026-08-26
// handoff asks for "whatever meta extras you want to surface". So this reads
// the bag generically rather than reaching for `venue` and `prize_pool` by
// name, which would show nothing for an event that names them differently.

export type EventMetaEntry = {
  key: string;
  label: string;
  value: string;
  // Rendered as a link when the value is one. Announced with its scheme
  // rather than dressed up as text.
  href: string | null;
};

// Keys consumed elsewhere in the UI, which would otherwise appear twice.
// `criteria_route` is already the "How entries are judged" button.
const CONSUMED = new Set(["criteria_route"]);

// A banner is not a data dump. An administrator can put anything in meta, and
// twenty rows of it would bury the event's name.
const MAX_ENTRIES = 6;

// "prize_pool" -> "Prize pool". Underscores and hyphens both act as word
// breaks; the first word is capitalised and the rest left alone so "PICC" or
// "eGov" inside a key survives.
function humanizeKey(key: string): string {
  const words = key.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function linkFor(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

export function eventMetaEntries(meta: Record<string, unknown> | null): EventMetaEntry[] {
  if (!meta) return [];

  const entries: EventMetaEntry[] = [];

  for (const [key, raw] of Object.entries(meta)) {
    if (entries.length >= MAX_ENTRIES) break;
    if (CONSUMED.has(key)) continue;

    // Scalars only. An object or an array has no single sensible rendering
    // here, and stringifying one would print "[object Object]" at a visitor.
    let value: string;
    if (typeof raw === "string") value = raw.trim();
    else if (typeof raw === "number" && Number.isFinite(raw)) value = String(raw);
    else if (typeof raw === "boolean") value = raw ? "Yes" : "No";
    else continue;

    if (!value) continue;

    entries.push({ key, label: humanizeKey(key), value, href: linkFor(value) });
  }

  return entries;
}
