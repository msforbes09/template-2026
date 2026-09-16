"use client";

import { Button } from "@/components/ui/button";
import { useUpdateSearchParams } from "@/hooks/use-update-search-params";

export function AdministratorsPagination({
  currentPage,
  hasNextPage,
}: {
  currentPage: number;
  hasNextPage: boolean;
}) {
  const update = useUpdateSearchParams();

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-2">
      <Button
        variant="outline"
        disabled={currentPage <= 1}
        aria-label="Previous page"
        onClick={() => update({ page: String(currentPage - 1) })}
      >
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">Page {currentPage}</span>
      <Button
        variant="outline"
        disabled={!hasNextPage}
        aria-label="Next page"
        onClick={() => update({ page: String(currentPage + 1) })}
      >
        Next
      </Button>
    </nav>
  );
}
