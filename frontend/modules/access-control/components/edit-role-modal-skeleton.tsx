export function EditRoleModalSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <div className="h-3.5 w-16 animate-pulse rounded bg-muted" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
