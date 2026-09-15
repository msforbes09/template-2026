"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CornerDownRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { replyToCatalogReview } from "@/modules/api-catalog/actions/catalog-review-actions";
import { replySchema } from "@/modules/reviews/schemas/review-schema";
import { REVIEW_REPLY_MAX } from "@/types/review";

// Only the review's own author can post here — a catalog has no owning
// citizen, so unlike a project thread there is no second party besides
// administrators, who reply through their own endpoint. Collapsed to a button
// until used, because a thread of open textareas reads as a form, not a
// conversation.
export function CatalogReplyForm({
  reviewUuid,
  identifier,
}: {
  reviewUuid: string;
  identifier: string;
}) {
  const router = useRouter();
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
      const result = await replyToCatalogReview(reviewUuid, identifier, parsed.data.comment);
      if (result.ok) {
        setComment("");
        setOpen(false);
        router.refresh();
        toast.success("Reply posted");
        return;
      }
      // The API is the authority on who may reply; if it says no, say so here
      // rather than leaving the text sitting in a box that will never send.
      const REFUSALS: Record<string, string> = {
        reply_not_allowed: "Only the reviewer can reply on their own thread.",
        account_pending: "Only approved developer accounts can reply.",
        too_many_requests: "You're posting too quickly. Try again in a minute.",
      };
      setError((result.code && REFUSALS[result.code]) ?? result.message);
    });
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <CornerDownRight aria-hidden className="size-3.5" />
        Reply
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
        placeholder="Write a reply…"
        aria-label="Your reply"
        aria-invalid={!!error}
      />
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
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
