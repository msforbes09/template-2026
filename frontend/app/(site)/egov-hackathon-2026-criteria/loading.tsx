export default function CriteriaLoading() {
  return (
    <div aria-hidden className="mx-auto max-w-[1400px] px-4 pb-20 sm:px-6 lg:px-10">
      <div className="max-w-3xl space-y-5 py-14 lg:py-20">
        <div className="h-4 w-40 animate-pulse rounded bg-muted/60" />
        <div className="h-12 w-2/3 animate-pulse rounded bg-muted lg:h-16" />
        <div className="h-6 w-full animate-pulse rounded bg-muted/60" />
      </div>
      <div className="grid gap-4 border-t border-border py-12 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-44 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
      <div className="space-y-px border-t border-border py-12">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-40 animate-pulse bg-muted/40" />
        ))}
      </div>
    </div>
  );
}
