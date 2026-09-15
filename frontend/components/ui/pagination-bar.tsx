"use client";

import { Button } from "@/components/ui/button";
import { useUpdateSearchParams } from "@/hooks/use-update-search-params";
import { paginationLabel, type PaginationLabelMode } from "@/lib/pagination-label";
import type { PaginationMeta } from "@/types/pagination";

// Paginator for endpoints that return Laravel's real paginator envelope, so
// the page count and total are known rather than inferred from a full page of
// rows (most lists in this app return a bare {data} and can't do this).
//
// Promoted out of modules/gateway-logs once the connection, auth-attempt and
// audit viewers needed the same thing — it has no gateway-specific behaviour.
export function PaginationBar({
  meta,
  scroll = true,
  labelMode,
  noun,
}: {
  meta: PaginationMeta;
  // false keeps the viewport put — for a paginator sitting well down the page
  // (inside a tab, say) where jumping to the top on every page change is
  // disorienting.
  scroll?: boolean;
  // "position" for lists whose rows no longer sit at the API's offsets — see
  // paginationLabel. Everything else keeps the default range.
  labelMode?: PaginationLabelMode;
  // What the rows are called, for the count and the empty state.
  noun?: string;
}) {
  const update = useUpdateSearchParams();
  const { current_page: page, last_page: lastPage } = meta;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-2">
      <Button
        variant="outline"
        disabled={page <= 1}
        aria-label="Previous page"
        onClick={() => update({ page: String(page - 1) }, { scroll })}
      >
        Previous
      </Button>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {paginationLabel(meta, { mode: labelMode, noun })}
      </p>
      <Button
        variant="outline"
        disabled={page >= lastPage}
        aria-label="Next page"
        onClick={() => update({ page: String(page + 1) }, { scroll })}
      >
        Next
      </Button>
    </nav>
  );
}
