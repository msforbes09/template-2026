"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare, ShieldCheck, Star, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ResourceModal } from "@/components/ui/resource-modal";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format-date";
import { replySchema } from "@/modules/reviews/schemas/review-schema";
import {
  loadAdminCatalogReviews,
  replyToCatalogReviewAsAdmin,
} from "@/modules/api-catalog/actions/catalog-review-actions";
import { REVIEW_REPLY_MAX } from "@/types/review";
import type { AdminApiCatalogReview } from "@/types/review";

// The official reply. Renders publicly as "eGov team" and never names the
// administrator, so the form says so — otherwise it reads like a personal
// response and someone signs it.
function OfficialReplyForm({
  reviewUuid,
  identifier,
  onPosted,
}: {
  reviewUuid: string;
  identifier: string;
  onPosted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const parsed = replySchema.safeParse({ comment });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Write a reply first");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await replyToCatalogReviewAsAdmin(reviewUuid, identifier, parsed.data.comment);
      if (result.ok) {
        setComment("");
        setOpen(false);
        toast.success("Official reply posted");
        onPosted();
        return;
      }
      setError(result.message);
    });
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <ShieldCheck aria-hidden className="size-3.5" />
        Reply officially
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        autoFocus
        rows={3}
        value={comment}
        maxLength={REVIEW_REPLY_MAX}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Write the official response…"
        aria-label="Official reply"
        aria-invalid={!!error}
      />
      <p className="text-xs text-muted-foreground">
        Posted publicly as the eGov team. Your name is never shown on the public thread.
      </p>
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" disabled={isPending} onClick={submit} className="gap-1.5">
          {isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
          Post reply
        </Button>
        <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ReviewsSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2 border-t border-border pt-6 first:border-t-0">
          <div className="h-4 w-56 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
        </div>
      ))}
    </div>
  );
}

export function AdminCatalogReviewsModal({
  id,
  identifier,
}: {
  id: number;
  identifier: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reviews, setReviews] = useState<AdminApiCatalogReview[] | null>(null);
  // Posting the official reply needs api-catalogs-manage, a level above the
  // api-catalogs-view that opens this modal. Resolved server-side with the
  // thread so a view-only administrator never sees a box that would 403.
  const [canReply, setCanReply] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [, startTransition] = useTransition();

  function load() {
    setReviews(null);
    setError(null);
    setDisabled(false);
    startTransition(async () => {
      const result = await loadAdminCatalogReviews(id);
      if (result.ok) {
        setReviews(result.data.data);
        setCanReply(result.data.canReply);
        return;
      }
      if (result.status === 401) {
        setOpen(false);
        router.push("/admin/login");
        return;
      }
      // Not an error: the surface is switched off by env.
      if (result.code === "reviews_disabled") {
        setDisabled(true);
        return;
      }
      setError(result.message);
    });
  }

  return (
    <ResourceModal
      open={open}
      onOpenChange={setOpen}
      onOpen={load}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`View ${identifier} reviews`}>
          <MessageSquare aria-hidden className="size-4" />
        </Button>
      }
      title={`${identifier} reviews`}
      description="Developer reviews with real identities. Anonymity applies to the public thread only."
      contentClassName="sm:max-w-3xl max-h-[90dvh]"
    >
      {disabled ? (
        <EmptyState
          icon={MessageSquare}
          title="Reviews are switched off"
          description="API-catalog reviews are disabled for this environment, so there is nothing to show."
        />
      ) : error ? (
        <EmptyState
          title="Couldn't load the reviews"
          description={error}
          action={<Button onClick={load}>Retry</Button>}
        />
      ) : !reviews ? (
        <ReviewsSkeleton />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No reviews yet"
          description="No developer has reviewed this API."
        />
      ) : (
        <ul>
          {reviews.map((review) => (
            <li key={review.uuid} className="border-t border-border py-5 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                  <UserRound aria-hidden className="size-3.5 text-muted-foreground" />
                  {review.user.display_name ?? "Unknown"}
                </span>
                {/* The identity is always shown here — the flag records that
                    the PUBLIC thread hides it, not that it is hidden from
                    administrators. */}
                {review.is_anonymous === 1 && <Badge variant="secondary">Anonymous publicly</Badge>}
                <span className="inline-flex items-center gap-1 text-sm">
                  <Star aria-hidden className="size-3.5 fill-amber-400 text-amber-400" />
                  {review.rating}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(review.created_at, "dd MMM yyyy")}
                </span>
              </div>

              {review.comment && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                  {review.comment}
                </p>
              )}

              {review.replies.length > 0 && (
                <ul className="mt-3 space-y-3 border-l-2 border-border pl-4">
                  {review.replies.map((reply) => (
                    <li key={reply.uuid}>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {reply.is_admin === 1 ? (
                          <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
                            <ShieldCheck aria-hidden className="size-3" />
                            {/* Named HERE though never publicly — an admin
                                needs to know which colleague answered. */}
                            {reply.admin?.name ?? "eGov team"}
                          </Badge>
                        ) : (
                          <span className="text-sm font-medium">
                            {reply.user?.display_name ?? "Unknown"}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(reply.created_at, "dd MMM yyyy")}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {reply.comment}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              {canReply && (
                <div className="mt-2">
                  <OfficialReplyForm
                    reviewUuid={review.uuid}
                    identifier={identifier}
                    onPosted={load}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </ResourceModal>
  );
}
