import type { PaginationMeta } from "@/types/pagination";

// The thread's own pagination meta, restated for a list that has had the
// reader's own review lifted out of it and pinned above.
//
// Only `total` can be restated. The offsets cannot: removing one row shifts
// every row after it, and the payload never says whether the removed row came
// from before or after the page being rendered — so on any page other than the
// one it was removed from, `from`/`to` are one too high. That is how page 2 of
// a 15-review thread came to read "11–15 of 14".
//
// They are therefore dropped rather than guessed at, and the paginator prints
// a position ("Page 2 of 2 · 14 reviews") built from the two numbers that are
// still true. See `lib/pagination-label.ts` and TODO item 26 — the offsets come
// back for free if the API ever grows an "exclude my own review" parameter,
// at which point this whole function goes away.
export function withoutPinned(
  meta: PaginationMeta | undefined,
  visibleRows: number,
  page: string,
  pinned: boolean,
): PaginationMeta {
  const fallback: PaginationMeta = {
    current_page: Number(page) || 1,
    last_page: 1,
    per_page: visibleRows,
    total: visibleRows,
    from: visibleRows === 0 ? 0 : 1,
    to: visibleRows,
  };

  if (!meta) return fallback;
  if (!pinned) return meta;

  return {
    ...meta,
    total: Math.max(0, meta.total - 1),
    from: null,
    to: null,
  };
}
