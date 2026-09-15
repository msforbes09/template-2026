export default function ProfileLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
      <div className="flex max-w-3xl flex-col gap-6">
        <div className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />
        <div className="h-48 animate-pulse rounded-xl border border-border bg-muted/40" />
        <div className="h-56 animate-pulse rounded-xl border border-border bg-muted/40" />
      </div>
    </div>
  );
}
