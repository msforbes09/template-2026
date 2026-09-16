export function EditAdministratorModalSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <div className="h-3.5 w-16 animate-pulse rounded bg-muted" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
          <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
          <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-3.5 w-12 animate-pulse rounded bg-muted" />
        {/* mirrors the FileUploader: avatar circle + button */}
        <div className="flex items-center gap-3">
          <div className="size-10 animate-pulse rounded-full bg-muted" />
          <div className="h-7 w-20 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
      <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
