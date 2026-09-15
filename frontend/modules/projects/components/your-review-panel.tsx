import { CornerDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format-date";
import { wasEdited } from "@/modules/reviews/lib/rating";
import { ReplyForm } from "@/modules/projects/components/reply-form";
import { ReviewStars } from "@/modules/reviews/components/star-rating";
import type { ProjectReview, ProjectReviewReply } from "@/types/project";

// Your own review, shown in full at the top of the thread rather than left to
// be found wherever it falls chronologically — which, past ten reviews, could
// be a page you never open.
//
// Replies are expanded here and folded everywhere else: a reply to YOUR review
// (usually the project team answering) is the one thing on this page written
// to you, so it should not need a click to discover.
//
// It reads from the caller's own singleton (GET user/projects/{uuid}/review,
// which eager-loads the thread), so it is right on every page of the thread.
export function YourReviewPanel({
  review,
  projectUuid,
  // Replying to your own review is the only reply an ordinary viewer may write
  // here, so the box lives in this panel and nowhere else on the public page.
  canReply,
}: {
  review: ProjectReview;
  projectUuid: string;
  canReply: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <ReviewStars rating={review.rating} />
        <span className="text-xs text-muted-foreground">
          {formatDate(review.created_at, "dd MMM yyyy")}
          {wasEdited(review.created_at, review.updated_at) && (
            <span className="ml-1.5 italic">edited</span>
          )}
        </span>
        {review.is_anonymous === 1 && <Badge variant="secondary">Posted anonymously</Badge>}
      </div>

      {review.comment && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
          {review.comment}
        </p>
      )}

      {review.replies.length > 0 && (
        <ul className="space-y-4 border-l-2 border-border pl-4">
          {review.replies.map((reply: ProjectReviewReply) => (
            <li key={reply.uuid}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <CornerDownRight aria-hidden className="size-3.5 text-muted-foreground" />
                {/* The owner is never named publicly, so the badge is the
                    attribution — same rule as the thread below. */}
                {reply.is_owner === 1 ? (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Project team
                  </Badge>
                ) : (
                  <span className="text-sm font-medium">
                    {reply.reviewer?.display_name ?? "Anonymous"}
                  </span>
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
      )}

      {canReply && <ReplyForm reviewUuid={review.uuid} projectUuid={projectUuid} />}
    </div>
  );
}
