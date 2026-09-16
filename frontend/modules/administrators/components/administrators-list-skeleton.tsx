export function AdministratorsListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="h-8 w-full animate-pulse rounded-lg bg-muted sm:max-w-xs" />
        <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="h-10 w-full animate-pulse bg-muted/60" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-14 w-full animate-pulse border-t border-border bg-muted/30" />
        ))}
      </div>
      <div className="flex justify-between">
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
