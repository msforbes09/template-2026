// Layout and ordering for the landing page's catalog bento (#catalog).
//
// Both are pure functions rather than inline logic because the section is no
// longer a hand-written list: it renders whatever the Common API publishes, so
// the count changes without anyone touching this file, and "does it still tile
// flush at 9 catalogs?" has to be answerable without opening a browser.

// Flagships first, in the order the section was originally designed around.
// Anything not listed — a catalog published after this was written — keeps its
// API order and lands after them, so a new entry appears without needing a
// code change, just not ahead of eGovPH SSO.
export const CATALOG_ORDER = [
  "egov-sso",
  "everify",
  "emessage",
  "egov-ai",
  "egovpay",
  "compass",
  "egovchain",
];

export function sortCatalogs<T extends { identifier: string }>(catalogs: T[]): T[] {
  const rank = (identifier: string) => {
    const index = CATALOG_ORDER.indexOf(identifier.toLowerCase());
    // Unranked entries all share one rank, and Array#sort is stable, so they
    // stay in the order the API returned them rather than being shuffled.
    return index === -1 ? CATALOG_ORDER.length : index;
  };
  return [...catalogs].sort((a, b) => rank(a.identifier) - rank(b.identifier));
}

// The grid is 12 columns at lg, so a card is either a third (span 4, three per
// row) or a quarter (span 3, four per row).
const WIDE = "lg:col-span-4";
const NARROW = "lg:col-span-3";

// Assigns each card its column span so the grid ends flush — no half-empty
// final row, which is what a fixed "three wide then four narrow" produced the
// moment the catalog stopped being seven entries.
//
// Rows of three come first and are used as much as possible (bigger cards up
// top, the original design's rhythm); rows of four absorb whatever three
// doesn't divide. A count that neither combination tiles exactly (1, 2, 5)
// falls back to all-wide and simply leaves the last row short — better than
// returning spans that don't add up.
export function catalogSpans(count: number): string[] {
  for (let narrowRows = 0; narrowRows * 4 <= count; narrowRows++) {
    const wide = count - narrowRows * 4;
    if (wide % 3 !== 0) continue;
    return [...Array<string>(wide).fill(WIDE), ...Array<string>(narrowRows * 4).fill(NARROW)];
  }
  return Array<string>(count).fill(WIDE);
}
