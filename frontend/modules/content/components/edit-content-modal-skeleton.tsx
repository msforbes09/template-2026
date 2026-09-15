export function EditContentModalSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3.5 w-12 animate-pulse rounded bg-muted" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3.5 w-10 animate-pulse rounded bg-muted" />
        {/* mirrors the min-h-[45dvh] editor plus its toolbar row */}
        <div className="h-[calc(45dvh+2.25rem)] w-full animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
