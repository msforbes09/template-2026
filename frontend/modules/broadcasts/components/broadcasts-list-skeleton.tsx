// Mirrors BroadcastsList: same card rhythm, same metadata row — so the page
// does not shift when the history lands.
export function BroadcastsListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
            <div className="h-5 w-56 animate-pulse rounded bg-muted" />
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-muted/70" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted/70" />
          </div>
          <div className="mt-4 flex gap-6">
            {Array.from({ length: 4 }).map((_, cell) => (
              <div key={cell} className="space-y-1.5">
                <div className="h-3 w-16 animate-pulse rounded bg-muted/50" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted/70" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
