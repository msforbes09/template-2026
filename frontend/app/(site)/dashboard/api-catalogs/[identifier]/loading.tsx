export default function ApiCatalogDocLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div aria-hidden className="mb-4 h-8 w-36 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="space-y-1 rounded-xl border border-border p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-full animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-7 w-64 animate-pulse rounded bg-muted" />
          <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-muted/60" />
          <div className="h-64 w-full animate-pulse rounded-xl bg-muted/40" />
        </div>
      </div>
    </div>
  );
}
