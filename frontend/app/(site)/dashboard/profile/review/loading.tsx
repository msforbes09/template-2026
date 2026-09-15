export default function ReviewProfileLoading() {
  return (
    <div aria-hidden className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <div className="h-5 w-24 animate-pulse rounded bg-muted/60" />
      <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
      <div className="h-32 animate-pulse rounded-xl bg-muted/50" />
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="space-y-3 rounded-xl border border-border p-6">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-8 animate-pulse rounded bg-muted/60" />
            <div className="h-8 animate-pulse rounded bg-muted/60" />
          </div>
        </div>
      ))}
    </div>
  );
}
