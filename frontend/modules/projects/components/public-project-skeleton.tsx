// Mirrors the redesigned public project page: the hero's 7/5 split with its
// image panel, then the 8/4 body with the demo block, the write-up and the
// rail. Matching the real proportions is what keeps the layout from jumping
// when the page swaps in.
export function PublicProjectSkeleton() {
  return (
    <div aria-hidden>
      <div className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-12 lg:gap-14 lg:px-10 lg:pb-20 lg:pt-14">
          <div className="flex flex-col justify-center gap-6 lg:col-span-7">
            <div className="h-7 w-48 animate-pulse rounded-full bg-muted" />
            <div className="space-y-3">
              <div className="h-12 w-full max-w-xl animate-pulse rounded bg-muted lg:h-16" />
              <div className="h-12 w-2/3 max-w-md animate-pulse rounded bg-muted lg:h-16" />
            </div>
            <div className="h-6 w-full max-w-sm animate-pulse rounded bg-muted/60" />
            <div className="flex gap-3">
              <div className="h-12 w-44 animate-pulse rounded-lg bg-muted" />
              <div className="h-12 w-40 animate-pulse rounded-lg bg-muted/60" />
            </div>
            <div className="h-4 w-64 animate-pulse rounded bg-muted/50" />
          </div>
          <div className="lg:col-span-5">
            <div className="aspect-video w-full animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-10 lg:py-20">
        <div className="space-y-14 lg:col-span-8">
          <div className="space-y-5">
            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            <div className="aspect-video w-full animate-pulse rounded-xl bg-muted" />
          </div>
          <div className="space-y-4">
            <div className="h-8 w-56 animate-pulse rounded bg-muted" />
            {["w-full", "w-11/12", "w-full", "w-10/12", "w-9/12"].map((width, index) => (
              <div key={index} className={`h-4 animate-pulse rounded bg-muted/60 ${width}`} />
            ))}
          </div>
        </div>
        <div className="space-y-8 lg:col-span-4">
          {[3, 5].map((rows, section) => (
            <div key={section} className="space-y-3">
              <div className="h-5 w-36 animate-pulse rounded bg-muted" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: rows }).map((_, index) => (
                  <div key={index} className="h-7 w-24 animate-pulse rounded-lg bg-muted/60" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
