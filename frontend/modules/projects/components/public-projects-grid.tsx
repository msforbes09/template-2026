import { AlertTriangle, FolderSearch } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { PublicProjectCard } from "@/modules/projects/components/public-project-card";
import { PublicProjectsFilters } from "@/modules/projects/components/public-projects-filters";
import {
  getEventProjects,
  getProjectTags,
  PUBLIC_PROJECTS_PER_PAGE,
} from "@/modules/projects/lib/get-public-projects";
import { getPublicApiCatalogs } from "@/modules/site/lib/get-public-api-catalog";
import { mergeEventTags } from "@/modules/projects/lib/project-tags";
import type { EgovEvent } from "@/types/project";

// The showcase grid, scoped to one event. The curated lists (TOP 30, TOP 5)
// are the same endpoint narrowed by `tag` — there is no separate list route
// any more.
export async function PublicProjectsGrid({
  slug,
  event,
  search,
  egovApi,
  tech,
  tag,
  sort,
  page,
}: {
  slug: string;
  // The event whose projects these are. Its curation labels are no longer in
  // the global catalogue, so without it every "TOP 30" chip renders neutral.
  event: EgovEvent;
  search: string;
  egovApi: string;
  tech: string;
  tag: string;
  sort: string;
  page: string;
}) {
  // No requireSession: these are the public reads, the one sanctioned place a
  // server read is unguarded.
  const [catalogs, globalTags] = await Promise.all([
    getPublicApiCatalogs(),
    getProjectTags(),
  ]);
  const catalog = mergeEventTags(globalTags, event);

  // Returns its failure as a value rather than throwing, so the read can be
  // cached without a rejection escaping the cache scope.
  const response = await getEventProjects(slug, {
    search,
    egov_api: egovApi,
    tech,
    tag,
    sort,
    page,
  });
  if (!response.ok) {
    return (
      <div className="space-y-6">
        <PublicProjectsFilters catalogs={catalogs} />
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load the projects"
          description={response.message}
        />
      </div>
    );
  }

  const projects = response.page.data;
  const meta = response.page.meta ?? {
    current_page: Number(page) || 1,
    last_page: 1,
    per_page: PUBLIC_PROJECTS_PER_PAGE,
    total: projects.length,
    from: projects.length ? 1 : null,
    to: projects.length || null,
  };
  const isFiltered = !!search || !!egovApi || !!tech;

  return (
    <div className="space-y-6">
      <PublicProjectsFilters catalogs={catalogs} />
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderSearch}
          title={
            isFiltered
              ? "No projects match those filters"
              : tag
                ? `Nothing tagged ${tag} yet`
                : "No projects published yet"
          }
          description={
            isFiltered
              ? "Every filter has to match. Try removing one."
              : "Entries appear here once they've been reviewed and published."
          }
        />
      ) : (
        <>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li key={project.uuid} className="flex">
                <PublicProjectCard project={project} catalog={catalog} />
              </li>
            ))}
          </ul>
          <PaginationBar meta={meta} />
        </>
      )}
    </div>
  );
}
