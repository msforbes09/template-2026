import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  CalendarRange,
  ExternalLink,
  Info,
  Lock,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api-client";
import { isMissingProjectError } from "@/modules/projects/lib/project-errors";
import { requireClientSession } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format-date";
import { DeleteProjectDialog } from "@/modules/projects/components/delete-project-dialog";
import { ProjectContentView } from "@/modules/projects/components/project-content-view";
import { PublicProjectRail } from "@/modules/projects/components/public-project-rail";
import { parseRemarks } from "@/modules/client-auth/lib/account-status";
import { ProjectReviews } from "@/modules/projects/components/project-reviews";
import { ProjectStatusBadge } from "@/modules/projects/components/project-status-badge";
import { ProjectTagChips } from "@/modules/projects/components/project-tag-chips";
import { SubmitProjectButton } from "@/modules/projects/components/submit-project-button";
import { getProjectTags } from "@/modules/projects/lib/get-public-projects";
import {
  ASSESSMENT_LOCK_MESSAGE,
  canSubmitProject,
  isLockedByAssessment,
  projectStatusLabel,
} from "@/modules/projects/lib/project-status";
import type { Project } from "@/types/project";
import { safeErrorMessage } from "@/lib/safe-error-message";
import { ProjectRatingSummary } from "@/modules/projects/components/project-rating-summary";

// The owner's view of one project: where it sits in review, what a reviewer
// said if it came back, and the controls for the next step. The body itself
// is the shared ProjectContentView, so the owner sees exactly what a visitor
// would once it's published.
export async function MyProjectDetail({
  uuid,
  // Which page of the review thread to show, from the URL — without it the
  // paginator below renders and does nothing.
  reviewsPage = "1",
}: {
  uuid: string;
  reviewsPage?: string;
}) {
  await requireClientSession();

  let project: Project;
  try {
    const response = await apiFetch<{ data: Project }>(
      `/projects/${uuid}`,
      { next: { tags: [`projects:${uuid}`] } },
      "client",
    );
    project = response.data;
  } catch (err) {
    // A project that isn't this citizen's is reported the same way as one
    // that doesn't exist, so both land on the not-found page.
    if (isMissingProjectError(err)) notFound();
    const message = safeErrorMessage(err, "Something went wrong loading this project.");
    return <EmptyState icon={AlertTriangle} title="Couldn't load this project" description={message} />;
  }

  const catalog = await getProjectTags();
  const state = projectStatusLabel(project.status, project.is_published);
  // While an admin holds the claim the API refuses edits and deletes with
  // 400 project_under_assessment, so the controls go rather than fail.
  const isLocked = isLockedByAssessment(project);
  // The newest history entry — what the CURRENT return asked for.
  const latestRemark = parseRemarks(project.assessment_remarks)[0] ?? null;
  const canSubmit = canSubmitProject(project.status) && !isLocked;
  const isPubliclyVisible = project.is_published === 1 && project.is_public === 1;

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ProjectStatusBadge status={project.status} isPublished={project.is_published} />
          <ProjectRatingSummary subject={project} size="sm" />
          {project.egov_event && (
            <Badge variant="secondary" className="gap-1.5">
              <CalendarRange aria-hidden className="size-3" />
              {project.egov_event.name}
            </Badge>
          )}
          <ProjectTagChips tags={project.tags} catalog={catalog} size="sm" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{project.name}</h1>
          {project.tagline && (
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">
              {project.tagline}
            </p>
          )}
        </div>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          {state.description}
        </p>
      </header>

      {/* Only meaningful on for_resubmission, but the API keeps the remarks
          after a resubmission too — showing them there would read as a fresh
          rejection, so they're scoped to the status that asks for action.
          The LATEST entry only: the column is the whole tagged history, and
          past cycles are the assessor's reference, not the citizen's todo —
          same rule as the account journey. */}
      {project.status === "for_resubmission" && latestRemark && (
        <section
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-5"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <RotateCcw aria-hidden className="size-4" />
            What the reviewer asked for{latestRemark.date ? ` · ${latestRemark.date}` : ""}
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {latestRemark.body}
          </p>
        </section>
      )}

      {isLocked && (
        <p
          role="status"
          className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
        >
          <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
          {ASSESSMENT_LOCK_MESSAGE}
        </p>
      )}

      <div className="flex flex-wrap gap-3 border-y border-border py-4">
        {isLocked ? (
          <Button variant="outline" disabled className="gap-1.5">
            <Pencil aria-hidden className="size-4" />
            Edit
          </Button>
        ) : (
          <Button
            variant="outline"
            nativeButton={false}
            className="gap-1.5"
            render={<Link href={`/dashboard/projects/${project.uuid}/edit`} />}
          >
            <Pencil aria-hidden className="size-4" />
            Edit
          </Button>
        )}
        {canSubmit && (
          <SubmitProjectButton
            uuid={project.uuid}
            isResubmission={project.status === "for_resubmission"}
            isLive={state.isLive}
          />
        )}
        {isPubliclyVisible && (
          <Button
            variant="outline"
            nativeButton={false}
            className="gap-1.5"
            // New tab: this is a step OUT of managing the project, and
            // losing the management screen to see the public one is a bad
            // trade when you are mid-task.
            render={
              <Link
                href={`/projects/${project.uuid}`}
                target="_blank"
                rel="noreferrer noopener"
              />
            }
          >
            <ExternalLink aria-hidden className="size-4" />
            View public page
          </Button>
        )}
        {!isLocked && (
          <DeleteProjectDialog
            uuid={project.uuid}
            name={project.name}
            isLive={isPubliclyVisible}
          />
        )}
      </div>

      {/* The public show's 8/4 shape, same as the admin review: media and
          write-up left, the shared sticky facts rail right. */}
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <ProjectContentView project={project} showFacts={false} />
        </div>
        <PublicProjectRail project={project} />
      </div>

      {/* Reviews only exist for a publicly visible project, and the thread
          endpoint 404s otherwise, so this is scoped to that state. Owner
          replies are enabled here because the fetch above already proved this
          project belongs to the caller. */}
      {isPubliclyVisible && (
        <ProjectReviews
          projectUuid={project.uuid}
          project={project}
          breakdown={project.rating_breakdown}
          page={reviewsPage}
          canReplyAsOwner
          isOwner
        />
      )}

      <footer className="border-t border-border pt-4 text-xs text-muted-foreground">
        Created {formatDate(project.created_at)} · Last edited {formatDate(project.updated_at)}
        {project.published_at && ` · Published ${formatDate(project.published_at)}`}
      </footer>
    </div>
  );
}
