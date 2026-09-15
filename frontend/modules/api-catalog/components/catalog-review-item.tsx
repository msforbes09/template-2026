import { CornerDownRight, ShieldCheck, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format-date";
import { wasEdited } from "@/modules/reviews/lib/rating";
import { DeveloperBadge } from "@/modules/reviews/components/developer-badge";
import { ReviewStars } from "@/modules/reviews/components/star-rating";
import { CatalogReplyForm } from "@/modules/api-catalog/components/catalog-reply-form";
import type { ApiCatalogReviewReply, PublicApiCatalogReview } from "@/types/review";

// Who a name belongs to on the public thread, given that anonymity is a
// display choice and an administrator is never named publicly:
//
//   reviewer null on a review        -> the reviewer chose anonymity
//   is_admin 1 on a reply            -> the official response, never named
//   reviewer null on someone's reply -> an anonymous reviewer replying to
//                                       themselves, so still unnamed
function replyAuthor(reply: ApiCatalogReviewReply): string {
  return reply.reviewer?.display_name ?? "Anonymous developer";
}

export function CatalogReviewItem({
  review,
  identifier,
  // The signed-in developer's own review uuid. Names cannot identify the
  // caller here (anonymity), so the thread is matched by uuid.
  myReviewUuid,
  // Whether this account may write at all — an approved developer.
  canReply = true,
}: {
  review: PublicApiCatalogReview;
  identifier: string;
  myReviewUuid?: string | null;
  canReply?: boolean;
}) {
  const isMine = !!myReviewUuid && myReviewUuid === review.uuid;
  // Author only. Administrators reply through the admin console, not here.
  const mayReply = canReply && isMine;
  const name = review.reviewer?.display_name ?? "Anonymous developer";

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
        <ul className="mt-4 space-y-4 border-l-2 border-border pl-4">
          {review.replies.map((reply) => (
            <li key={reply.uuid}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <CornerDownRight aria-hidden className="size-3.5 text-muted-foreground" />
                {/* An admin reply has no name to show — the public resource
                    never carries one — so the badge IS the attribution.
                    Printing "eGov team" as a name and again as a badge beside
                    it would be a stutter. */}
                {reply.is_admin === 1 ? (
                  <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
                    <ShieldCheck aria-hidden className="size-3" />
                    eGov team
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
      )}

      {mayReply && (
        <div className="mt-3">
          <CatalogReplyForm reviewUuid={review.uuid} identifier={identifier} />
        </div>
      )}
    </article>
  );
}
