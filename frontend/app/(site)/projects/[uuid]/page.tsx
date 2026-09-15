import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PublicProjectBody } from "@/modules/projects/components/public-project-body";
import { PublicProjectHero } from "@/modules/projects/components/public-project-hero";
import { PublicProjectJsonLd } from "@/modules/projects/components/public-project-json-ld";
import {
  ProjectReviews,
  ProjectReviewsSkeleton,
} from "@/modules/projects/components/project-reviews";
import {
  RelatedProjects,
  RelatedProjectsSkeleton,
} from "@/modules/projects/components/related-projects";
import {
  getEgovEvent,
  getProjectTags,
  getPublicProject,
  getPublicProjectUuids,
} from "@/modules/projects/lib/get-public-projects";
import { projectExcerpt } from "@/modules/projects/lib/project-excerpt";
import { mergeEventTags } from "@/modules/projects/lib/project-tags";
import type { PublicProject } from "@/types/project";

// Every published project is prerendered from the public list, so `params`
// isn't a runtime API here and the whole page — metadata and JSON-LD
// included — is static output rather than a shell with a dynamic hole. A uuid
// outside that set still renders on demand; notFound() then serves
// not-found.tsx.
//
// Same placeholder dance as the API catalog detail page: under
// cacheComponents an empty generateStaticParams is a hard build error (E898),
// and this list is legitimately empty until the first project is published.
const PLACEHOLDER_UUID = "__placeholder__";

export async function generateStaticParams() {
  const uuids = await getPublicProjectUuids();
  if (uuids.length === 0) return [{ uuid: PLACEHOLDER_UUID }];
  return uuids.map((uuid) => ({ uuid }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ uuid: string }>;
}): Promise<Metadata> {
  const { uuid } = await params;
  // Never hit the API for the placeholder — when the list was empty because
  // the API was unreachable, this would fail the build all over again.
  if (uuid === PLACEHOLDER_UUID) {
    return { title: "Project not found", robots: { index: false, follow: false } };
  }
  const project = await getPublicProject(uuid);
  if (!project) return { title: "Project not found", robots: { index: false, follow: false } };

  const description = project.tagline ?? projectExcerpt(project.description);
  const url = `/projects/${project.uuid}`;
  return {
    title: project.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: project.name,
      description,
      publishedTime: project.published_at,
      images: project.photo?.url ? [{ url: project.photo.url, alt: project.name }] : [],
    },
    twitter: {
      card: project.photo?.url ? "summary_large_image" : "summary",
      title: project.name,
      description,
    },
  };
}

type ReviewsSearchParams = Promise<{ page?: string }>;

// The searchParams promise is passed down and awaited HERE, inside the
// reviews boundary, never in the page body — awaiting it up there would make
// the whole route dynamic and throw away the prerendered shell above.
async function ProjectReviewsForParams({
  project,
  searchParams,
}: {
  project: PublicProject;
  searchParams: ReviewsSearchParams;
}) {
  const { page = "1" } = await searchParams;
  return (
    <ProjectReviews
      projectUuid={project.uuid}
      project={project}
      breakdown={project.rating_breakdown}
      page={page}
      // Only used when the viewer turns out to own this project: they
      // cannot reply from here, so send them where they can.
      manageHref={`/dashboard/projects/${project.uuid}`}
    />
  );
}

export default async function PublicProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ uuid: string }>;
  searchParams: ReviewsSearchParams;
}) {
  const { uuid } = await params;
  if (uuid === PLACEHOLDER_UUID) notFound();
  const project = await getPublicProject(uuid);
  if (!project) notFound();

  // The project's own event supplies its curation labels; the global
  // catalogue stopped carrying them (2026-08-26 handoff), so a "TOP 30" chip
  // renders neutral without this. egov_event on a project is a bare
  // {id,slug,name} reference, hence the lookup by slug.
  const [globalTags, event] = await Promise.all([
    getProjectTags(),
    project.egov_event ? getEgovEvent(project.egov_event.slug) : null,
  ]);
  const catalog = mergeEventTags(globalTags, event);

  return (
    <>
      <PublicProjectJsonLd project={project} />
      {/* Full-bleed sections, so the back link gets its own contained strip
          above the hero rather than sitting inside it (the hero's text column
          is already carrying four elements). */}
      <div className="mx-auto max-w-[1400px] px-4 pt-8 sm:px-6 lg:px-10">
        <Link
          href="/projects"
          className="group -ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ArrowLeft
            aria-hidden
            className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
          />
          All projects
        </Link>
      </div>

      <PublicProjectHero project={project} catalog={catalog} />
      <PublicProjectBody project={project} />
      {/* Its own boundary too: the thread reads per-session data (the caller's
          own review), so it must not be part of the page's cached shell. */}
      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <Suspense fallback={<ProjectReviewsSkeleton />}>
          <ProjectReviewsForParams project={project} searchParams={searchParams} />
        </Suspense>
      </div>
      {/* Its own boundary: a sibling lookup should never hold up the project
          the visitor actually asked for. */}
      <Suspense fallback={<RelatedProjectsSkeleton />}>
        <RelatedProjects
          currentUuid={project.uuid}
          eventSlug={project.egov_event?.slug ?? null}
          catalog={catalog}
        />
      </Suspense>
    </>
  );
}
