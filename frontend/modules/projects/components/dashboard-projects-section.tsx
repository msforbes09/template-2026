import Link from "next/link";
import { AlertTriangle, ArrowRight, FolderPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api-client";
import { requireClientSession } from "@/lib/auth/dal";
import { MyProjectCard } from "@/modules/projects/components/my-project-card";
import { getProjectTags } from "@/modules/projects/lib/get-public-projects";
import type { Paginated } from "@/types/pagination";
import type { ProjectListItem } from "@/types/project";
import { safeErrorMessage } from "@/lib/safe-error-message";

// The dashboard's main content: what this citizen has entered into the
// hackathon. Shows the most recent few as real cards (the same card the full
// list uses) and hands off to /dashboard/projects for filtering and the rest.
const PREVIEW_COUNT = 6;

export async function DashboardProjectsSection() {
  await requireClientSession();

  let projects: ProjectListItem[] = [];
  let total = 0;
  let loadError: string | null = null;
  try {
    const response = await apiFetch<Paginated<ProjectListItem>>(
      `/projects?per_page=${PREVIEW_COUNT}`,
      { next: { tags: ["my-projects"] } },
      "client",
    );
    projects = response.data;
    total = response.meta?.total ?? response.data.length;
  } catch (err) {
    loadError = safeErrorMessage(err, "Something went wrong loading your projects.");
  }

  return (
    <section aria-labelledby="your-projects" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="your-projects" className="text-lg font-semibold tracking-tight">
            Your <span className="text-primary">projects</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your entries. An administrator reviews each one before it appears on the public
            showcase.
          </p>
        </div>
        <div className="flex gap-2">
          {total > PREVIEW_COUNT && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              nativeButton={false}
              render={<Link href="/dashboard/projects" />}
            >
              View all {total}
              <ArrowRight aria-hidden className="size-3.5" />
            </Button>
          )}
          {projects.length > 0 && (
            <Button
              size="sm"
              className="gap-1.5"
              nativeButton={false}
              render={<Link href="/dashboard/projects/new" />}
            >
              <Plus aria-hidden className="size-3.5" />
              New project
            </Button>
          )}
        </div>
      </div>

      {loadError ? (
        <EmptyState icon={AlertTriangle} title="Couldn't load your projects" description={loadError} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="You haven't entered a project yet"
          description="Tell us what you built with the eGov APIs, and pick the event you're entering it into. You can keep editing it until you submit it for review."
          action={
            <Button
              nativeButton={false}
              render={<Link href="/dashboard/projects/new" />}
              className="gap-1.5"
            >
              <Plus aria-hidden className="size-4" />
              Enter a project
            </Button>
          }
        />
      ) : (
        <ProjectGrid projects={projects} />
      )}
    </section>
  );
}

// Split out so the tag catalogue is only fetched when there is something to
// render it against.
async function ProjectGrid({ projects }: { projects: ProjectListItem[] }) {
  const catalog = await getProjectTags();
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <li key={project.uuid} className="flex">
          <MyProjectCard project={project} catalog={catalog} />
        </li>
      ))}
    </ul>
  );
}

// Mirrors the section: heading row, then a three-column card grid.
export function DashboardProjectsSectionSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="space-y-2">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted/60" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-xl border border-border">
            <div className="aspect-[16/9] animate-pulse bg-muted" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted/70" />
              <div className="h-3 w-28 animate-pulse rounded bg-muted/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
