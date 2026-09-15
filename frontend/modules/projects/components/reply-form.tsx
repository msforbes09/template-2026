"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CornerDownRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { replyToReview } from "@/modules/projects/actions/review-actions";
import { replySchema } from "@/modules/reviews/schemas/review-schema";
import { REVIEW_REPLY_MAX } from "@/types/project";

// Only two people can post here — the review's author and the project owner —
// so this is rendered only when the caller is one of them. Collapsed to a
// button until used, because a thread of open textareas reads as a form, not
// a conversation.
export function ReplyForm({
  reviewUuid,
  projectUuid,
}: {
  reviewUuid: string;
  projectUuid: string;
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
      const result = await replyToReview(reviewUuid, projectUuid, parsed.data.comment);
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
        reply_not_allowed: "Only the reviewer and the project team can reply here.",
        profile_incomplete: "Complete your profile before replying.",
        account_suspended: "Your account is suspended, so you can't reply.",
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
