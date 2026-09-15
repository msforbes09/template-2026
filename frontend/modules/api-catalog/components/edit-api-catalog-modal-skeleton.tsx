export function EditApiCatalogModalSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-1.5">
          <div className="h-3.5 w-12 animate-pulse rounded bg-muted" />
          <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
          <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-3.5 w-10 animate-pulse rounded bg-muted" />
        {/* mirrors the markdown field: toolbar bar + split write/preview panes */}
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="h-9 w-full animate-pulse bg-muted/60" />
          <div className="grid lg:grid-cols-2">
            <div className="h-[52dvh] w-full animate-pulse bg-muted/30" />
            <div className="hidden h-[52dvh] w-full animate-pulse bg-muted/20 lg:block" />
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-3.5 w-10 animate-pulse rounded bg-muted" />
        <div className="h-32 w-full animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
