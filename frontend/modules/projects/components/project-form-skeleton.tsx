// Mirrors ProjectForm: five sections, each a heading plus its fields, with the
// markdown editor's tall pane in the middle — so the page doesn't resize when
// the form (and its fetched API catalogue) streams in.
export function ProjectFormSkeleton() {
  return (
    <div aria-hidden className="space-y-10">
      {[3, 1, 3, 2, 2].map((fields, section) => (
        <div key={section} className="space-y-5">
          <div className="space-y-2">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted/60" />
          </div>
          {Array.from({ length: fields }).map((_, field) => (
            <div key={field} className="space-y-1.5">
              <div className="h-4 w-28 animate-pulse rounded bg-muted/70" />
              <div
                className={
                  section === 1
                    ? "h-[40dvh] animate-pulse rounded-md bg-muted"
                    : "h-9 animate-pulse rounded-md bg-muted"
                }
              />
            </div>
          ))}
        </div>
      ))}
      <div className="flex justify-end gap-3">
        <div className="h-9 w-24 animate-pulse rounded-md bg-muted/60" />
        <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
