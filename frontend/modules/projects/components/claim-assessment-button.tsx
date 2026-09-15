"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pin, PinOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProjectClaimConflictDialog } from "@/modules/projects/components/project-claim-conflict-dialog";
import { projectClaimConflict } from "@/modules/projects/lib/claim-conflict";
import { toggleProjectAssessment } from "@/modules/projects/actions/admin-project-actions";

// Claiming is what unlocks publish and send-back, so it's the first control
// on the review screen. The same endpoint releases your own claim; another
// admin's claim answers 403 assessment_not_owned, which is surfaced as the
// toast rather than hidden — two assessors racing for the same project need
// to know which of them holds it.
//
// Icons follow the users-module claim language: Pin claims (the project is
// pinned to this admin), PinOff releases.
//
// One claim per admin: when the WS refuses the claim because another project
// is held (assessment_already_in_progress), the shared conflict dialog opens
// naming the held project, offering to move the claim (the transfer retry),
// jump to that project's review, or cancel — instead of a dead-end toast.
export function ClaimAssessmentButton({
  uuid,
  name,
  isClaimed,
  isMine,
  claimedBy,
}: {
  uuid: string;
  name: string;
  isClaimed: boolean;
  isMine: boolean;
  claimedBy: string | null;
}) {
  const router = useRouter();
  // The held project blocking this claim; non-null opens the transfer dialog.
  const [conflict, setConflict] = useState<{ uuid: string; name: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(transfer: boolean) {
    startTransition(async () => {
      const result = await toggleProjectAssessment(uuid, transfer);
      if (result.ok) {
        setConflict(null);
        router.refresh();
        toast.success(isMine ? "Assessment released" : "You're now assessing this project");
        return;
      }
      const held = projectClaimConflict(result);
      if (held) {
        setConflict(held);
        return;
      }
      toast.error(result.message);
    });
  }

  // Someone else holds it: no control, just who to talk to.
  if (isClaimed && !isMine) {
    return (
      <p className="text-sm text-muted-foreground">
        Being assessed by <span className="font-medium text-foreground">{claimedBy ?? "another administrator"}</span>
      </p>
    );
  }

  return (
    <>
      <Button
        variant={isMine ? "outline" : "default"}
        disabled={isPending}
        onClick={() => toggle(false)}
        className="gap-1.5"
      >
        {isPending ? (
          <Loader2 aria-hidden className="size-4 animate-spin" />
        ) : isMine ? (
          <PinOff aria-hidden className="size-4" />
        ) : (
          <Pin aria-hidden className="size-4" />
        )}
        {isMine ? "Release assessment" : "Start assessment"}
      </Button>

      <ProjectClaimConflictDialog
        conflict={conflict}
        targetName={name}
        isPending={isPending}
        onTransfer={() => toggle(true)}
        onClose={() => setConflict(null)}
      />
    </>
  );
}
