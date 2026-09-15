import Link from "next/link";
import { ExternalLink, ImageOff, Lock } from "lucide-react";
import { formatDate } from "@/lib/format-date";
import { isLockedByAssessment } from "@/modules/projects/lib/project-status";
import { ProjectStatusBadge } from "@/modules/projects/components/project-status-badge";
import { ProjectTagChips } from "@/modules/projects/components/project-tag-chips";
import type { ProjectListItem, ProjectTag } from "@/types/project";
import { ProjectRatingSummary } from "@/modules/projects/components/project-rating-summary";

// A citizen's project as a card on /dashboard/projects. List rows are lean
// (no description, no links) — everything else needs the detail page, which
// the whole card links to.
export function MyProjectCard({
  project,
  catalog,
}: {
  project: ProjectListItem;
  catalog: ProjectTag[];
}) {
  const isLive = project.is_published === 1 && project.is_public === 1;

  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40">
      <div className="flex aspect-[16/9] items-center justify-center overflow-hidden bg-muted/40">
        {project.photo?.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed CDN URL, not configured for next/image
          <img
            src={project.photo.url}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <ImageOff aria-hidden className="size-8 text-muted-foreground/40" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-snug tracking-tight">
            {/* Stretched link: the whole card is the target, but only the
                title is in the accessibility tree as a link. */}
            <Link href={`/dashboard/projects/${project.uuid}`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
              {project.name}
            </Link>
          </h3>
          <span className="flex shrink-0 items-center gap-1.5">
            {/* The list carries the flag, so the lock is visible without
                opening the project. */}
            {isLockedByAssessment(project) && (
              <span
                title="An administrator is reviewing this project"
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400"
              >
                <Lock aria-hidden className="size-3" />
                In review
              </span>
            )}
            <ProjectStatusBadge status={project.status} isPublished={project.is_published} />
          </span>
        </div>
        {project.tagline && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {project.tagline}
          </p>
        )}
        <ProjectTagChips tags={project.tags} catalog={catalog} size="sm" limit={3} />
        {/* Wraps as whole phrases. In a three-column grid this row is narrow
            enough to break "17 Aug 2026" across lines and split "View public
            page" in half, so each part is kept intact and allowed to move to
            its own line instead. */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-2 text-xs text-muted-foreground">
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="whitespace-nowrap">
              Updated {formatDate(project.updated_at, "dd MMM yyyy")}
            </span>
            <ProjectRatingSummary subject={project} size="sm" />
          </span>
          {isLive && (
            // Above the stretched link so it stays independently clickable.
            <Link
              href={`/projects/${project.uuid}`}
              target="_blank"
              rel="noreferrer noopener"
              className="relative z-10 inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-medium text-primary underline-offset-4 hover:underline"
            >
              View public page
              <ExternalLink aria-hidden className="size-3" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
