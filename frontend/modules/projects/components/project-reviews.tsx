import Link from "next/link";
import { connection } from "next/server";
import { AlertTriangle, ArrowUpRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { isFeatureEnabled } from "@/modules/feature-flags/lib/get-feature-flags";
import { getClientSession } from "@/lib/auth/dal";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { canReview, isSuspended } from "@/modules/client-auth/lib/account";
import { RatingSummary } from "@/modules/reviews/components/star-rating";
import { ReviewForm } from "@/modules/projects/components/review-form";
import { ReviewItem } from "@/modules/projects/components/review-item";
import { YourReviewPanel } from "@/modules/projects/components/your-review-panel";
import { withoutPinned } from "@/modules/projects/lib/without-pinned";
import { getMyReview } from "@/modules/projects/actions/review-actions";
import { isProjectOwner } from "@/modules/projects/actions/client-project-actions";
import { getPublicProjectReviews } from "@/modules/projects/lib/get-project-reviews";
import { RatingBreakdownBars } from "@/modules/reviews/components/rating-breakdown";
import type { Rateable } from "@/modules/reviews/lib/rating";
import type { RatingBreakdown } from "@/types/project";

// The public review thread plus, for a signed-in citizen, their own review.
//
// The two halves are fetched differently on purpose: the thread is identical
// for every visitor and is cached, while "your review" is per-session and
// never is. Any authenticated citizen can review — approval is not required
// here, unlike authoring a project.
export async function ProjectReviews({
  projectUuid,
  project,
  // Per-star counts, from the show endpoints only. Absent on a list card, and
  // absent entirely until the backend carrying it is deployed.
  breakdown,
  page = "1",
  // The owner replies from their dashboard, where ownership is already
  // established; on the public page only a reviewer's own thread is theirs.
  canReplyAsOwner,
  // Set by a caller that has ALREADY proved this project belongs to the
  // viewer (the dashboard, whose fetch was own-scoped) — it skips the probe
  // below. Leave it unset on the public page, where ownership is unknown and
  // has to be asked for.
  //
  // The API refuses a self-review outright (`cannot_review_own_project` — see
  // SelfReviewException), so offering the form to an owner could only ever end
  // in an error they can do nothing about. The thread and the summary stay: an
  // owner still needs to read reviews and reply to them.
  isOwner,
  // Set by the PUBLIC page only. The owner cannot reply from there — replying
  // belongs to the project-management screen — so instead of a dead thread we
  // point them at it.
  manageHref,
}: {
  projectUuid: string;
  project: Rateable;
  breakdown?: RatingBreakdown;
  page?: string;
  canReplyAsOwner?: boolean;
  isOwner?: boolean;
  manageHref?: string;
}) {
  // The FRONTEND kill switch, checked before anything is fetched.
  //
  // `await connection()` is load-bearing, not ceremony — the same trap
  // CatalogReviews documents. Everything below reads cookies, which is what
  // makes this subtree a dynamic hole; an early return ABOVE that read has no
  // such protection, so with the flag off at build time Next would prerender
  // the `null` straight into the static shell and the section would stay gone
  // even after the flag was turned back on. connection() stops the prerender
  // here so the env is read per request.
  //
  // Separate from the backend's switch handled below: that one 404s the
  // endpoints and is discovered by asking. This one avoids asking at all.
  await connection();
  if (!(await isFeatureEnabled("project_reviews"))) return null;

  const [reviews, session] = await Promise.all([
    getPublicProjectReviews(projectUuid, page),
    getClientSession(),
  ]);

  // The BACKEND's own refusal (`reviews.enabled:projects`, whose value the
  // flag above now drives) 404s every endpoint on this surface, the
  // public thread included. That is "the feature is off", so the whole section
  // goes rather than rendering an error or an empty thread above a write form
  // that would fail on submit. Still handled even with the UI flag on, since
  // the two are set independently.
  if (!reviews.ok && reviews.disabled) return null;

  // Writing a review or a reply requires a COMPLETED profile, and a suspended
  // account cannot write at all. Both are read from the profile rather than
  // the session, and gating here means the form is never offered to somebody
  // the API would refuse.
  // Both are per-session and independent, so they go together rather than
  // one after the other.
  const [profile, owns] = await Promise.all([
    session ? getClientProfile() : null,
    isOwner ?? (session ? isProjectOwner(projectUuid) : false),
  ]);
  const mayReview = !!profile && canReview(profile);

  // Only asked for when there is somebody to ask about, and never for the
  // owner — the API refuses them a review at all, so the lookup could only
  // ever 404 (which is logged as an error even though it is expected).
  const myReview = session && !owns ? await getMyReview(projectUuid) : null;
  const mine = myReview?.ok ? myReview.data : null;

  // Pinned above, so it must not appear a second time in the thread. The API's
  // count still includes it, hence the -1 — a list of nine under a label
  // reading "of ten" is the kind of small lie that makes people distrust the
  // rest of the page.
  const threadRows = reviews.ok
    ? reviews.page.data.filter((review) => review.uuid !== mine?.uuid)
    : [];

  return (
    <section aria-labelledby="reviews-heading" className="scroll-mt-24" id="reviews">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="reviews-heading" className="text-2xl font-semibold tracking-tight">
          Reviews
        </h2>
        <RatingSummary subject={project} emptyLabel="No ratings yet" />
      </div>

      <div className="mt-6">
        <RatingBreakdownBars subject={project} breakdown={breakdown} />
      </div>

      {owns && manageHref && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-6">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">This is your project</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You can&apos;t rate or reply from the public page. Answer reviewers from your
              project page.
            </p>
          </div>
          <Button variant="outline" nativeButton={false} render={<Link href={manageHref} />}>
            Manage project
            <ArrowUpRight aria-hidden className="size-4" />
          </Button>
        </div>
      )}

      {!owns && (
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        {session && mayReview ? (
          <>
            <h3 className="text-sm font-semibold tracking-tight">
              {mine ? "Your review" : "Rate this project"}
            </h3>
            {mine && (
              <div className="mt-4">
                <YourReviewPanel
                  review={mine}
                  projectUuid={projectUuid}
                  canReply={mayReview}
                />
              </div>
            )}
            <div className="mt-4">
              <ReviewForm projectUuid={projectUuid} review={mine} />
            </div>
          </>
        ) : session ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Rate this project</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {profile && isSuspended(profile)
                  ? "Your account is suspended, so you can't post reviews."
                  : "Complete your profile to rate and review projects."}
              </p>
            </div>
            {profile && !isSuspended(profile) && (
              <Button variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
                Complete your profile
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Rate this project</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in to leave a rating and a comment.
              </p>
            </div>
            <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>
              Sign in
            </Button>
          </div>
        )}
      </div>
      )}

      <div className="mt-8">
        {!reviews.ok ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load the reviews"
            description={reviews.message}
          />
        ) : threadRows.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No reviews yet"
            description={
              mine
                ? "Nobody else has reviewed this project yet."
                : owns
                  ? "Nobody has reviewed this project yet."
                  : "Be the first to say what you think of this project."
            }
          />
        ) : (
          <>
            <ul>
              {threadRows.map((review) => (
                <li key={review.uuid}>
                  <ReviewItem
                    review={review}
                    projectUuid={projectUuid}
                    myReviewUuid={mine?.uuid}
                    canReply={mayReview}
                    canReplyAsOwner={canReplyAsOwner && mayReview}
                    // Open where the reader can act on them — the owner's own
                    // management screen. Folded for everyone else.
                    repliesDefaultOpen={canReplyAsOwner === true}
                  />
                </li>
              ))}
            </ul>
    {(reviews.page.meta?.last_page ?? 1) > 1 && (
              <div className="mt-6">
                {/* Position, not a range: the reader's own review has been
                    lifted out of these rows, so the API's offsets no longer
                    describe what is on screen (TODO item 26). */}
                <PaginationBar
                  meta={withoutPinned(reviews.page.meta, threadRows.length, page, !!mine)}
                  scroll={false}
                  labelMode="position"
                  noun="review"
                />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// Mirrors the section: heading row, the write-a-review card, and a few review
// blocks with their meta line and body.
export function ProjectReviewsSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-5 w-28 animate-pulse rounded bg-muted/60" />
      </div>
      <div className="h-32 w-full animate-pulse rounded-xl bg-muted/50" />
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2 border-t border-border pt-6 first:border-t-0">
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
