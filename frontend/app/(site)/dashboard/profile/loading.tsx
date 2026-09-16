export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div
          aria-hidden
          className="h-32 animate-pulse rounded-xl border border-dashed border-border bg-muted/40"
        />
        <div
          aria-hidden
          className="h-40 animate-pulse rounded-xl border border-dashed border-border bg-muted/40"
        />
        <div
          aria-hidden
          className="h-24 animate-pulse rounded-xl border border-dashed border-border bg-muted/40"
        />
      </div>
    </div>
  );
}
