// Mirrors NotificationsList: the same filter row and mark-all control, the
// same bordered container, and rows the height of a real one (icon, title,
// body, timestamp) — so the page does not jump when the data lands.
export function NotificationsListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-11 w-44 animate-pulse rounded-lg bg-muted" />
        <div className="h-8 w-36 animate-pulse rounded-md bg-muted/70" />
      </div>
      <div className="flex flex-col gap-1 rounded-xl border border-border p-1.5">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-start gap-3 p-3">
            <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted/70" />
              <div className="h-3 w-32 animate-pulse rounded bg-muted/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
