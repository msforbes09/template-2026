import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicProjectCard } from "@/modules/projects/components/public-project-card";
import { getEventProjects } from "@/modules/projects/lib/get-public-projects";
import type { ProjectTag, PublicProjectListItem } from "@/types/project";

// The old detail page ended at the last paragraph, so the only way onward was
// the browser's back button. Three sibling entries plus a route back to the
// full list turns the page into part of the showcase instead of a leaf.
//
// Renders nothing when this is the only published project, rather than an
// empty band with a heading over it.
export async function RelatedProjects({
  currentUuid,
  eventSlug,
  catalog,
}: {
  currentUuid: string;
  // The project's own event, taken from its `egov_event` — siblings only make
  // sense within the same programme. Nothing to show when it belongs to none.
  eventSlug: string | null;
  catalog: ProjectTag[];
}) {
  if (!eventSlug) return null;
  const response = await getEventProjects(eventSlug, { page: "1" });
  const projects = (response.ok ? response.page.data : []).filter(
    (project: PublicProjectListItem) => project.uuid !== currentUuid,
  );
  if (projects.length === 0) return null;

  return (
    <section aria-labelledby="more-projects" className="border-t border-border bg-muted/20">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="more-projects" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            More from this <span className="text-primary">event</span>
          </h2>
          <Button
            variant="outline"
            nativeButton={false}
            className="gap-2"
            render={<Link href="/projects" />}
          >
            All projects
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        </div>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.slice(0, 3).map((project: PublicProjectListItem) => (
            <li key={project.uuid} className="flex">
              <PublicProjectCard project={project} catalog={catalog} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Mirrors the grid above so the band doesn't collapse when it streams in.
export function RelatedProjectsSkeleton() {
  return (
    <section aria-hidden className="border-t border-border bg-muted/20">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <div className="h-9 w-72 animate-pulse rounded bg-muted" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-xl border border-border">
              <div className="aspect-[16/9] animate-pulse bg-muted" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-20 animate-pulse rounded-full bg-muted/70" />
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
