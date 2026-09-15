// A stable colour per gateway platform (partner slug). The platform set is
// whatever API catalogs exist, so there's no fixed map — the slug is hashed
// onto a palette instead, which keeps a given partner the same colour on
// every list, page and modal without anyone maintaining a table.
//
// Colours are muted chip tones (faint tint + readable text, light and dark)
// and are never the only signal — the slug is always rendered as text.

export const PLATFORM_TONES = [
  // Deliberately few and quiet: enough to tell neighbours apart at a glance,
  // not so many that a list of ten partners reads as confetti.
  "border-sky-500/25 bg-sky-500/8 text-sky-800 dark:text-sky-300",
  "border-violet-500/25 bg-violet-500/8 text-violet-800 dark:text-violet-300",
  "border-emerald-500/25 bg-emerald-500/8 text-emerald-800 dark:text-emerald-300",
  "border-amber-500/25 bg-amber-500/8 text-amber-800 dark:text-amber-300",
] as const;

export function platformTone(slug: string): (typeof PLATFORM_TONES)[number] {
  const key = slug.trim().toLowerCase();
  // djb2 — tiny, stable, and spreads short ASCII slugs well enough.
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash + key.charCodeAt(i)) | 0;
  }
  return PLATFORM_TONES[Math.abs(hash) % PLATFORM_TONES.length];
}
