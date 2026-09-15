// Mirrors AdminProjectsList: queue tabs, the filter row, a six-column table
// with the same 12-unit row height (the row carries a thumbnail), and the
// paginator.
export function AdminProjectsListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-11 w-full max-w-md animate-pulse rounded-lg bg-muted/60" />
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="h-9 w-full animate-pulse rounded-md bg-muted sm:max-w-xs" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted sm:w-52" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted sm:w-44" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted sm:w-44" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="h-11 w-full animate-pulse bg-muted/50" />
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-20 w-full animate-pulse border-t border-border bg-muted/20" />
        ))}
      </div>
      <div className="h-9 w-full animate-pulse rounded-md bg-muted/50" />
    </div>
  );
}
