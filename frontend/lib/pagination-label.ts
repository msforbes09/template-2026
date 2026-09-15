import { formatNumber } from "@/lib/format-number";
import type { PaginationMeta } from "@/types/pagination";

export type PaginationLabelMode = "range" | "position";

// What the paginator says between its two buttons.
//
// `range` ("1–10 of 14") is the default and what most lists want: the offsets
// come straight from the API and describe exactly the rows on screen.
//
// `position` ("Page 2 of 2 · 14 reviews") exists for lists whose rows no
// longer sit at the API's offsets. A review thread lifts the reader's own
// review out and pins it above the list, which shifts every row after it — and
// the payload does not say whether the lifted row came from before or after
// the current page, so the offsets cannot be corrected, only abandoned.
// `total` survives that (it is one less, and we know it), so position mode
// prints the two numbers that are still true and no offset at all.
export function paginationLabel(
  meta: PaginationMeta,
  options: { mode?: PaginationLabelMode; noun?: string } = {},
): string {
  const { mode = "range", noun = "result" } = options;
  const { current_page: page, last_page: lastPage, from, to, total } = meta;

  if (total === 0) return `No ${plural(noun, 0)}`;

  if (mode === "position") {
    return `Page ${formatNumber(page)} of ${formatNumber(lastPage)} · ${formatNumber(total)} ${plural(noun, total)}`;
  }

  // `from`/`to` are null only on an empty page, which `total === 0` has
  // already answered — the fallbacks are belt and braces for a malformed
  // envelope rather than a case that should occur.
  return `${formatNumber(from ?? 1)}–${formatNumber(to ?? total)} of ${formatNumber(total)}`;
}

function plural(noun: string, count: number): string {
  return count === 1 ? noun : `${noun}s`;
}
