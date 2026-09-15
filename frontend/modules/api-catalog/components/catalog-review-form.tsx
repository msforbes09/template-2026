"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { StarRatingInput } from "@/modules/reviews/components/star-rating-input";
import { reviewSchema } from "@/modules/reviews/schemas/review-schema";
import {
  createCatalogReview,
  deleteCatalogReview,
  updateCatalogReview,
} from "@/modules/api-catalog/actions/catalog-review-actions";
import { REVIEW_COMMENT_MAX } from "@/types/review";
import type { ApiCatalogReview } from "@/types/review";

// Write or edit the caller's own review of one catalog. A singleton, so the
// same form is both: `review` present means edit (PUT), absent means create
// (POST). Kept deliberately close to the project review form — the two are
// the same interaction and should not drift apart visually.
export function CatalogReviewForm({
  identifier,
  review,
}: {
  identifier: string;
  review: ApiCatalogReview | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [comment, setComment] = useState(review?.comment ?? "");
  const [isAnonymous, setIsAnonymous] = useState(review?.is_anonymous === 1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const parsed = reviewSchema.safeParse({ rating, comment, is_anonymous: isAnonymous });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your review");
      return;
    }
    setError(null);
    startTransition(async () => {
      const values = {
        rating: parsed.data.rating,
        comment: parsed.data.comment,
        is_anonymous: parsed.data.is_anonymous,
      };
      const result = review
        ? await updateCatalogReview(identifier, values)
        : await createCatalogReview(identifier, values);

      if (result.ok) {
        router.refresh();
        toast.success(review ? "Review updated" : "Review posted");
        return;
      }
      const REFUSALS: Record<string, string> = {
        // Only reachable if the thread was written in another tab; the form
        // is not offered when a review already exists.
        review_already_exists: "You've already reviewed this API. Reload to edit it.",
        account_pending: "Only approved developer accounts can review APIs.",
        too_many_requests: "You're posting too quickly. Try again in a minute.",
      };
      setError((result.code && REFUSALS[result.code]) ?? result.message);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteCatalogReview(identifier);
      if (result.ok) {
        setRating(0);
        setComment("");
        setIsAnonymous(false);
        router.refresh();
        toast.success("Review removed");
        return;
      }
      setError(result.message);
    });
  }

  return (
    <div className="space-y-4">
      <StarRatingInput value={rating} onChange={setRating} />

      <Textarea
        rows={4}
        value={comment}
        maxLength={REVIEW_COMMENT_MAX}
        onChange={(event) => setComment(event.target.value)}
        placeholder="What was it like to build against this API? (optional)"
        aria-label="Your review"
        aria-invalid={!!error}
      />

      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
        <div>
          <p className="text-sm font-medium">Post anonymously</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Hides your name on the public thread. Administrators still see who wrote it.
          </p>
        </div>
        <Switch
          checked={isAnonymous}
          onCheckedChange={setIsAnonymous}
          aria-label="Post anonymously"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button disabled={isPending} onClick={submit} className="gap-1.5">
          {isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
          {review ? "Save changes" : "Post review"}
        </Button>
        {review && (
          <Button
            variant="ghost"
            disabled={isPending}
            onClick={remove}
            className="gap-1.5 text-muted-foreground"
          >
            <Trash2 aria-hidden className="size-4" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
