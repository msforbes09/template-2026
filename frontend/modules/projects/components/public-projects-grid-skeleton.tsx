// Mirrors PublicProjectsGrid: the filter bar, a three-column card grid with
// the same 16:9 media block, and the paginator.
export function PublicProjectsGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div aria-hidden className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="h-9 w-full animate-pulse rounded-md bg-muted sm:max-w-sm" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted sm:w-48" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted sm:w-48" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-xl border border-border">
            <div className="aspect-[16/9] animate-pulse bg-muted" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-20 animate-pulse rounded-full bg-muted/70" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
              <div className="h-3 w-32 animate-pulse rounded bg-muted/50" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-9 w-full animate-pulse rounded-md bg-muted/50" />
    </div>
  );
}
