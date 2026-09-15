// Mirrors <ContentBlock>'s block grid: the rail (timestamp + desktop anchor
// nav) and a stack of section cards at the real cards' padding and radius.
export function ContentBlockSkeleton() {
  return (
    <div aria-hidden className="grid animate-pulse gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14">
      <div>
        <div className="h-4 w-44 rounded bg-muted" />
        <div className="mt-8 hidden space-y-3 border-l border-border pl-4 lg:block">
          <div className="h-3 w-24 rounded bg-muted" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 w-40 rounded bg-muted/70" />
          ))}
        </div>
      </div>
      <div className="grid content-start gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[20px] border border-border bg-card/80 p-6 sm:p-8"
          >
            <div className="h-5 w-48 rounded bg-muted" />
            <div className="mt-5 space-y-2.5">
              <div className="h-4 w-full rounded bg-muted/70" />
              <div className="h-4 w-full rounded bg-muted/70" />
              <div className="h-4 w-2/3 rounded bg-muted/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
