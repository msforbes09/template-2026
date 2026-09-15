// Mirrors MyProjectDetail / the public project page: badge row, title block,
// action bar, media, and body text.
export function ProjectDetailSkeleton() {
  return (
    <div aria-hidden className="space-y-8">
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-9 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-5 w-1/2 animate-pulse rounded bg-muted/60" />
        </div>
      </div>
      <div className="flex gap-3 border-y border-border py-4">
        <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="aspect-[16/9] w-full animate-pulse rounded-xl bg-muted" />
      <div className="space-y-2">
        {["w-full", "w-11/12", "w-10/12", "w-9/12"].map((width, index) => (
          <div key={index} className={`h-4 animate-pulse rounded bg-muted/60 ${width}`} />
        ))}
      </div>
    </div>
  );
}
