import { ChevronRight, CornerDownRight, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format-date";
import { wasEdited } from "@/modules/reviews/lib/rating";
import { repliesSummary } from "@/modules/projects/lib/replies-summary";
import { ReplyForm } from "@/modules/projects/components/reply-form";
import { ReviewStars } from "@/modules/reviews/components/star-rating";
import type { ProjectReviewer, ProjectReviewReply, PublicProjectReview } from "@/types/project";

// An approved developer account. Anonymous reviewers carry no reviewer block
// at all, so an anonymous developer stays unbadged, which is the point of
// choosing anonymity.
function DeveloperBadge({ reviewer }: { reviewer: ProjectReviewer | null }) {
  if (reviewer?.is_developer !== 1) return null;
  return (
    <Badge variant="secondary" className="bg-primary/10 text-primary">
      Developer
    </Badge>
  );
}

// Who a name belongs to on the public thread, given that anonymity is a
// display choice and the site exposes no project owner identity at all:
//
// - reviewer null on a review        -> the reviewer chose anonymity
// - is_owner 1 on a reply            -> the project team, never named
// - reviewer null on someone's reply -> an anonymous reviewer replying to
//                                       themselves, so still unnamed
function replyAuthor(reply: ProjectReviewReply): string {
  if (reply.is_owner === 1) return "Project team";
  return reply.reviewer?.display_name ?? "Anonymous";
}

export function ReviewItem({
  review,
  projectUuid,
  // The signed-in citizen's own review uuid. Names cannot identify the caller
  // here (anonymity), so the thread is matched by uuid, per the handoff.
  myReviewUuid,
  // The project owner may reply to every review; a reviewer only to their own.
  canReplyAsOwner,
  // Whether this account may write at all — a completed, unsuspended profile.
  // Replies carry the same requirement as reviews.
  canReply: mayWrite = true,
  // Folded by default so a long thread stays scannable. Open where the reader
  // has a stake in the replies: their own review, or a screen where they can
  // answer them.
  repliesDefaultOpen = false,
}: {
  review: PublicProjectReview;
  projectUuid: string;
  myReviewUuid?: string | null;
  canReplyAsOwner?: boolean;
  canReply?: boolean;
  repliesDefaultOpen?: boolean;
}) {
  const isMine = !!myReviewUuid && myReviewUuid === review.uuid;
  const canReply = mayWrite && (isMine || !!canReplyAsOwner);
  const name = review.reviewer?.display_name ?? "Anonymous";

  return (
    <article className="border-t border-border py-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
          <UserRound aria-hidden className="size-3.5 text-muted-foreground" />
          {name}
        </span>
        <DeveloperBadge reviewer={review.reviewer} />
        {isMine && <Badge variant="secondary">Your review</Badge>}
        <ReviewStars rating={review.rating} />
        <span className="text-xs text-muted-foreground">
          {formatDate(review.created_at, "dd MMM yyyy")}
          {/* No edited flag from the API: it is an edit iff updated_at is
              later than created_at. */}
          {wasEdited(review.created_at, review.updated_at) && (
            <span className="ml-1.5 italic">edited</span>
          )}
        </span>
      </div>

      {review.comment && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
          {review.comment}
        </p>
      )}

      {review.replies.length > 0 && (
        // <details> rather than a client component: this is a Server Component
        // and folding needs no state of its own. It also works before (and
        // without) hydration, and brings its own keyboard and screen-reader
        // behaviour.
        <details open={repliesDefaultOpen} className="group mt-3">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
            <ChevronRight
              aria-hidden
              className="size-3.5 transition-transform group-open:rotate-90"
            />
            {repliesSummary(review.replies)}
          </summary>
        <ul className="mt-3 space-y-4 border-l-2 border-border pl-4">
          {review.replies.map((reply) => (
            <li key={reply.uuid}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <CornerDownRight aria-hidden className="size-3.5 text-muted-foreground" />
                {/* The owner has no name to show, so the badge IS the
                    attribution. Printing "Project team" as the name and again
                    as a badge beside it is a stutter. */}
                {reply.is_owner === 1 ? (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Project team
                  </Badge>
                ) : (
                  <>
                    <span className="text-sm font-medium">{replyAuthor(reply)}</span>
                    <DeveloperBadge reviewer={reply.reviewer} />
                  </>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDate(reply.created_at, "dd MMM yyyy")}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {reply.comment}
              </p>
            </li>
          ))}
        </ul>
        </details>
      )}

      {canReply && (
        <div className="mt-3">
          <ReplyForm reviewUuid={review.uuid} projectUuid={projectUuid} />
        </div>
      )}
    </article>
  );
}
