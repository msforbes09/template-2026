import { PublicProjectsGridSkeleton } from "@/modules/projects/components/public-projects-grid-skeleton";

export default function ProjectsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      <div aria-hidden className="space-y-4">
        <div className="h-4 w-40 animate-pulse rounded bg-muted/60" />
        <div className="h-10 w-2/3 max-w-lg animate-pulse rounded bg-muted" />
        <div className="h-5 w-full max-w-2xl animate-pulse rounded bg-muted/60" />
        <div className="h-10 w-56 animate-pulse rounded-lg bg-muted/60" />
      </div>
      <div className="mt-10">
        <PublicProjectsGridSkeleton />
      </div>
    </div>
  );
}
