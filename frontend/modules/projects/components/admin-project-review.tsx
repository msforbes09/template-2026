import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  CalendarRange,
  ExternalLink,
  GitBranch,
  GitCompare,
  Pencil,
  ShieldX,
  UserCog,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { isMissingProjectError } from "@/modules/projects/lib/project-errors";
import { requireAdminSession } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format-date";
import { parseRemarks } from "@/modules/client-auth/lib/account-status";
import { getAdminProfile } from "@/modules/admin/lib/get-admin-profile";
import { ClaimAssessmentButton } from "@/modules/projects/components/claim-assessment-button";
import { DeleteProjectDialog } from "@/modules/projects/components/delete-project-dialog";
import { ProjectContentView } from "@/modules/projects/components/project-content-view";
import { ProjectDiffView } from "@/modules/projects/components/project-diff-view";
import { AdminProjectReviews } from "@/modules/projects/components/admin-project-reviews";
import { ProjectStatusBadge } from "@/modules/projects/components/project-status-badge";
import { ProjectTagChips } from "@/modules/projects/components/project-tag-chips";
import { ProjectTagsModal } from "@/modules/projects/components/project-tags-modal";
import { mergeEventTags, withEventTagGroup } from "@/modules/projects/lib/project-tags";
import { PublicProjectRail } from "@/modules/projects/components/public-project-rail";
import { PublishProjectButton } from "@/modules/projects/components/publish-project-button";
import { SendBackDialog } from "@/modules/projects/components/send-back-dialog";
import { TogglePublishButton } from "@/modules/projects/components/toggle-publish-button";
import {
  getEgovEvent,
  getProjectTagGroups,
  getProjectTags,
} from "@/modules/projects/lib/get-public-projects";
import { diffProjectSnapshot, PROJECT_FIELD_LABELS } from "@/modules/projects/lib/project-diff";
import { adminCan, PERMISSIONS } from "@/modules/admin/lib/admin-can";
import { isClaimable, projectStatusLabel } from "@/modules/projects/lib/project-status";
import type { AdminProject } from "@/types/project";
import { safeErrorMessage } from "@/lib/safe-error-message";

// The assessor's screen: claim it, compare the working copy against what's
// live, then publish or send it back. The show endpoint is the only one that
// carries `published_snapshot`, which is what makes the comparison possible.
export async function AdminProjectReview({
  uuid,
  // Which page of the review thread to show. Lives in the URL like every
  // other list in this app, so a link to page 3 stays a link to page 3.
  reviewsPage = "1",
}: {
  uuid: string;
  reviewsPage?: string;
}) {
  await requireAdminSession();

  let project: AdminProject;
  try {
    const response = await apiFetch<{ data: AdminProject }>(
      `/projects/${uuid}`,
      { next: { tags: [`projects:${uuid}`] } },
      "admin",
    );
    project = response.data;
  } catch (err) {
    if (isMissingProjectError(err)) notFound();
    if (isApiError(err) && err.status === 403) {
      return (
        <EmptyState
          icon={ShieldX}
          title="You don't have access to this project"
          description="Ask an administrator to grant you the projects-view permission."
        />
      );
    }
    const message = safeErrorMessage(err, "Something went wrong loading this project.");
    return <EmptyState icon={AlertTriangle} title="Couldn't load this project" description={message} />;
  }

  const [globalTags, globalGroups, profile, event] = await Promise.all([
    getProjectTags(),
    getProjectTagGroups(),
    getAdminProfile(),
    // This project's own event carries the curation labels the global
    // catalogue no longer does, and is the only extra set the backend will
    // accept on PUT .../tags — another event's label answers 422.
    project.egov_event ? getEgovEvent(project.egov_event.slug) : null,
  ]);
  const catalog = mergeEventTags(globalTags, event);
  const groups = withEventTagGroup(globalGroups, event);

  const state = projectStatusLabel(project.status, project.is_published);
  // projects-view reads this screen; every assessment affordance (claiming,
  // publishing, sending back, tags, visibility, delete) needs projects-manage.
  // The claim-gated buttons hide themselves already (a viewer can never hold
  // the claim), but the claim-FREE controls — the claim button itself, the
  // visibility toggle, tags — leaked without this.
  const canManage = await adminCan(PERMISSIONS.projectsManage);

  const isClaimed = project.is_assessment_started === 1;
  // The claim belongs to whoever's id is on it; only they can edit, delete,
  // publish or send back (the API answers 403 assessment_not_owned to anyone
  // else). Editing no longer auto-claims, so an admin can no longer silently
  // take over a colleague's claim — the flow is claim, then edit.
  const isMine = isClaimed && !!profile && project.assessment_started_by?.id === profile.id;
  // `published` is claimable now too: a live project can be claimed for a
  // correction. `draft` and `for_resubmission` belong to the citizen.
  const inAssessableLane = isClaimable(project.status);
  const canPublish = isMine && inAssessableLane;
  // Send-back is for_assessment only — a for_publishing entry is the admin's
  // own lane, with no citizen to send it back to.
  const canSendBack = isMine && project.status === "for_assessment";
  const hasBeenPublished = !!project.published_at;
  const isLive = project.is_published === 1;

  const snapshot = project.published_snapshot;
  const changedFields = snapshot ? diffProjectSnapshot(project, snapshot) : [];
  // The tagged send-back history, one entry per cycle, newest first.
  const remarkEntries = parseRemarks(project.assessment_remarks);

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ProjectStatusBadge status={project.status} isPublished={project.is_published} />
          {project.user ? (
            <Badge variant="secondary" className="gap-1.5">
              <UserRound aria-hidden className="size-3" />
              {project.user.display_name}
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1.5">
              <UserCog aria-hidden className="size-3" />
              Administrator
            </Badge>
          )}
          {project.egov_event && (
            <Badge variant="secondary" className="gap-1.5">
              <CalendarRange aria-hidden className="size-3" />
              {project.egov_event.name}
            </Badge>
          )}
          <ProjectTagChips tags={project.tags} catalog={catalog} size="sm" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.tagline && (
            <p className="mt-2 text-base text-muted-foreground">{project.tagline}</p>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{state.description}</p>
      </header>

      <section
        aria-label="Assessment"
        className="space-y-4 rounded-xl border border-border bg-card p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Assessment</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isClaimed
                ? `Claimed ${formatDate(project.assessment_started_at)}`
                : canManage
                  ? "Claim this project to publish it or send it back."
                  : "Unclaimed."}
            </p>
          </div>
          {inAssessableLane && canManage ? (
            <ClaimAssessmentButton
              uuid={project.uuid}
              name={project.name}
              isClaimed={isClaimed}
              isMine={isMine}
              claimedBy={project.assessment_started_by?.name ?? null}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing to assess — this project isn&apos;t in a review queue.
            </p>
          )}
        </div>
        {!isMine && inAssessableLane && canManage && (
          <p className="rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
            {isClaimed
              ? "Another administrator holds this assessment. Editing, publishing and sending back are theirs until they release it, or until it expires after 12 hours of inactivity."
              : "Start the assessment to edit, publish or send this project back. Claiming it stops another administrator working on it at the same time."}
          </p>
        )}
        <div className="flex flex-wrap gap-3 border-t border-border pt-4">
          {canPublish && (
            <PublishProjectButton uuid={project.uuid} isRepublish={hasBeenPublished} />
          )}
          {canSendBack && <SendBackDialog uuid={project.uuid} />}
          {hasBeenPublished && canManage && <TogglePublishButton uuid={project.uuid} isLive={isLive} />}
          {/* Tags need no claim — curation is deliberately never blocked. */}
          {canManage && (
            <ProjectTagsModal uuid={project.uuid} tags={project.tags} groups={groups} />
          )}
          {/* Both halves need projects-manage: the disabled placeholder's
              tooltip instructs claiming, which a viewer cannot do. */}
          {canManage &&
            (isMine ? (
              <Button
                variant="outline"
                nativeButton={false}
                className="gap-1.5"
                render={<Link href={`/admin/projects/${project.uuid}/edit`} />}
              >
                <Pencil aria-hidden className="size-4" />
                Edit
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled
                className="gap-1.5"
                title={
                  inAssessableLane
                    ? "Start the assessment to edit this project"
                    : "Only the citizen can edit a draft or a project sent back for changes"
                }
              >
                <Pencil aria-hidden className="size-4" />
                Edit
              </Button>
            ))}
          {/* Visibility is is_published alone now: toggle-publish never moves
              status, so an approved project can sit hidden. */}
          {isLive && project.is_public === 1 && (
            <Button
              variant="outline"
              nativeButton={false}
              className="gap-1.5"
              // New tab, like the citizen's View-public-page: it's a step OUT
              // of the assessment, and losing this screen mid-review to see
              // the public one is a bad trade.
              render={
                <Link
                  href={`/projects/${project.uuid}`}
                  target="_blank"
                  rel="noreferrer noopener"
                />
              }
            >
              <ExternalLink aria-hidden className="size-4" />
              Public page
            </Button>
          )}
          {/* The project's own external links, lifted out of the content view
              (showLinks={false} below) so every open-a-thing control sits in
              one row. External sites — new tab, like Public page. */}
          <Button
            variant="outline"
            nativeButton={false}
            className="gap-1.5"
            render={<a href={project.project_url} target="_blank" rel="noreferrer noopener" />}
          >
            <ExternalLink aria-hidden className="size-4" />
            Live project
          </Button>
          {project.repository_url && (
            <Button
              variant="outline"
              nativeButton={false}
              className="gap-1.5"
              render={<a href={project.repository_url} target="_blank" rel="noreferrer noopener" />}
            >
              <GitBranch aria-hidden className="size-4" />
              Repository
            </Button>
          )}
          {/* Delete requires the claim too (403 assessment_not_owned). */}
          {isMine && (
            <DeleteProjectDialog
              uuid={project.uuid}
              name={project.name}
              isLive={isLive}
              audience="admin"
            />
          )}
        </div>
        {project.published_by && (
          <p className="text-xs text-muted-foreground">
            Last published by {project.published_by.name} · {formatDate(project.published_at)}
          </p>
        )}
      </section>

      {/* The whole tagged history, one card per cycle, newest first — the
          same presentation as the user assessment. While waiting on the
          citizen it reads as the outstanding remarks; DURING an assessment it
          is the reference for what earlier cycles flagged. */}
      {remarkEntries.length > 0 &&
        (project.status === "for_resubmission" ? (
          <section className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
            <h2 className="text-sm font-semibold text-destructive">Sent back with remarks</h2>
            <div className="mt-3 space-y-2">
              {remarkEntries.map((entry, index) => (
                <div key={index} className="rounded-lg border border-border bg-background/60 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {entry.tag ?? "Remark"}
                    {entry.date ? ` · ${entry.date}` : ""}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{entry.body}</p>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-border bg-muted/40 p-5">
            <h2 className="text-sm font-semibold">Previous assessment remarks</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              What earlier review cycles flagged, newest first.
            </p>
            <div className="mt-3 space-y-2">
              {remarkEntries.map((entry, index) => (
                <div key={index} className="rounded-lg border border-border bg-background/60 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {entry.tag ?? "Remark"}
                    {entry.date ? ` · ${entry.date}` : ""}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{entry.body}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

      {/* The change signal, before the content: an amber callout naming the
          changed fields, or one quiet line when publishing would be a no-op.
          Absent entirely on a never-published project. */}
      {snapshot &&
        (changedFields.length > 0 ? (
          <section
            role="status"
            aria-label="Changed since the published version"
            className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5"
          >
            <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
              <GitCompare aria-hidden className="size-4" />
              Changed since the published version
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {changedFields.map((field) => (
                <Badge key={field} className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  {PROJECT_FIELD_LABELS[field]}
                </Badge>
              ))}
            </div>
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">
            Identical to the published version — publishing changes nothing.
          </p>
        ))}

      <section aria-label="Working copy" className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Working copy {snapshot && inAssessableLane && (
            <span className="text-sm font-normal text-muted-foreground">· up for publishing</span>
          )}
        </h2>
        {!snapshot && (
          <p className="text-sm text-muted-foreground">
            This project has never been published, so there&apos;s nothing to compare against.
          </p>
        )}
        {/* The public show's 8/4 shape: media and write-up left, the same
            sticky facts rail the public page renders on the right. */}
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <ProjectContentView project={project} showLinks={false} showFacts={false} />
          </div>
          <PublicProjectRail project={project} />
        </div>
      </section>

      {/* Field-by-field diff + the full published copy, ONLY when something
          actually changed — an identical or never-published project has
          nothing to compare. */}
      {snapshot && changedFields.length > 0 && (
        <>
          <section aria-label="What changed" className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <GitCompare aria-hidden className="size-4 text-muted-foreground" />
              What changed
            </h2>
            <ProjectDiffView working={project} snapshot={snapshot} changed={changedFields} />
          </section>
          <details className="group rounded-xl border border-border">
            <summary className="cursor-pointer select-none rounded-xl px-5 py-4 text-sm font-semibold tracking-tight transition-colors hover:bg-muted/40">
              Full published version {isLive ? "· live now" : "· currently offline"}
              <span className="ml-2 font-normal text-muted-foreground group-open:hidden">
                — unfold to view
              </span>
            </summary>
            <div className="border-t border-border p-5">
              {/* The same 8/4 shape as the working copy above, so the two
                  versions read alike. The snapshot's own links stay inline —
                  the Assessment card's buttons carry the WORKING copy's URLs,
                  which may be exactly what changed. */}
              <div className="grid gap-10 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <ProjectContentView project={snapshot} showFacts={false} />
                </div>
                <PublicProjectRail project={snapshot} />
              </div>
            </div>
          </details>
        </>
      )}

      {/* Read-only: there is no moderation endpoint yet. */}
      <AdminProjectReviews projectUuid={project.uuid} project={project} page={reviewsPage} />

      <footer className="border-t border-border pt-4 text-xs text-muted-foreground">
        Created {formatDate(project.created_at)} · Last edited {formatDate(project.updated_at)}
      </footer>
    </div>
  );
}
