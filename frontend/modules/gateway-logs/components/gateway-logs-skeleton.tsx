// Mirrors the real list's dimensions: the filter selects, a table header plus
// rows, and the paginator row. `filters` tracks how many selects the toolbar
// actually renders — two on the account-wide views, one where the platform is
// already fixed (the per-catalog usage tab).
//
// `credits` adds the per-catalog allowance panel that sits above the filters on
// that same tab. Off by default: the account-wide usage page renders its
// credits in a SEPARATE Suspense boundary, so including it here would draw the
// block twice.
export function GatewayLogsSkeleton({
  rows = 8,
  filters = 2,
  credits = false,
}: {
  rows?: number;
  filters?: number;
  credits?: boolean;
}) {
  return (
    <div className="space-y-4">
      {credits && <div className="h-[7.5rem] w-full animate-pulse rounded-xl bg-muted/40" />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {Array.from({ length: filters }).map((_, i) => (
          <div key={i} className="h-8 w-full animate-pulse rounded-lg bg-muted sm:w-48" />
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="h-10 w-full animate-pulse bg-muted/60" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-14 w-full animate-pulse border-t border-border bg-muted/30" />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-28 animate-pulse rounded bg-muted/70" />
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
