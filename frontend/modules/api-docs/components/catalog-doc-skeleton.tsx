// Matches CatalogDocView's dimensions — masthead, tab row, then the
// viewer's sidebar-tree + document-pane grid — so the streamed content
// doesn't shift the page when it lands.
export function CatalogDocSkeleton() {
  return (
    <div className="space-y-8" aria-hidden>
      {/* Masthead placeholder — kicker, title, two description lines */}
      <div className="space-y-3">
        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="space-y-2 pt-1">
          <div className="h-4 w-full max-w-[44ch] animate-pulse rounded bg-muted/70" />
          <div className="h-4 w-2/3 max-w-[32ch] animate-pulse rounded bg-muted/70" />
        </div>
      </div>
      {/* Tab row placeholder */}
      <div className="flex gap-6">
        <div className="h-5 w-36 animate-pulse rounded bg-muted" />
        <div className="h-5 w-24 animate-pulse rounded bg-muted/60" />
        <div className="h-5 w-28 animate-pulse rounded bg-muted/60" />
      </div>
      {/* Viewer placeholder — sidebar tree + document pane */}
      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="space-y-1 rounded-xl border border-border p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-full animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-7 w-64 animate-pulse rounded bg-muted" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-muted/60" />
          <div className="h-64 w-full animate-pulse rounded-xl bg-muted/40" />
        </div>
      </div>
    </div>
  );
}
