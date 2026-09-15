"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ProjectClaimConflictDialog } from "@/modules/projects/components/project-claim-conflict-dialog";
import { projectClaimConflict } from "@/modules/projects/lib/claim-conflict";
import { isClaimable } from "@/modules/projects/lib/project-status";
import { toggleProjectAssessment } from "@/modules/projects/actions/admin-project-actions";
import type { AdminProjectListItem } from "@/types/project";

// The users-style icon cluster for a project row: `[pin] | eye`. The pin is
// the claim affordance — outline Pin claims (confirm dialog, then straight to
// the review screen the claim just unlocked), filled primary Pin is your own
// claim (click continues it), filled muted Pin is another admin's (click
// still opens the review, which is readable) — and the eye is the plain show
// affordance. `draft`/`for_resubmission` rows are citizen territory with
// nothing to claim, so viewers and unclaimable rows get the eye alone.
export function ProjectRowActions({
  project,
  currentAdminId,
  canManage,
}: {
  project: AdminProjectListItem;
  currentAdminId: number | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [conflict, setConflict] = useState<{ uuid: string; name: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const reviewHref = `/admin/projects/${project.uuid}`;
  const isClaimed = project.is_assessment_started === 1;
  const isMine =
    isClaimed && currentAdminId !== null && project.assessment_started_by?.id === currentAdminId;
  const showPin = canManage && (isClaimed || isClaimable(project.status));

  // The claim itself; ConfirmDialog awaits it directly (it runs its own
  // transition), the transfer dialog wraps it in this component's.
  async function doClaim(transfer: boolean) {
    const result = await toggleProjectAssessment(project.uuid, transfer);
    if (result.ok) {
      setConflict(null);
      toast.success(`You're now assessing ${project.name}`);
      router.push(reviewHref);
      return;
    }
    const held = projectClaimConflict(result);
    if (held) {
      setConflict(held);
      return;
    }
    toast.error(result.message);
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {showPin && (
        <>
          {isClaimed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    nativeButton={false}
                    aria-label={
                      isMine
                        ? `Continue assessing ${project.name}`
                        : `${project.name} is being assessed by another administrator`
                    }
                    render={<Link href={reviewHref} />}
                  >
                    <Pin
                      aria-hidden
                      fill="currentColor"
                      className={cn("size-4", isMine ? "text-primary" : "text-muted-foreground")}
                    />
                  </Button>
                }
              />
              <TooltipContent>
                {isMine ? "Continue assessment" : "Started by another admin"}
              </TooltipContent>
            </Tooltip>
          ) : (
            /* The row keeps a confirmation — a stray click here would claim a
               project the admin hasn't even looked at. */
            <Tooltip>
              <ConfirmDialog
                trigger={
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        aria-label={`Start assessment for ${project.name}`}
                      >
                        <Pin aria-hidden className="size-4" />
                      </Button>
                    }
                  />
                }
                title={`Start assessing ${project.name}?`}
                description="This claims the project for you — editing, publishing and sending back unlock, and other administrators can't act on it until you release it."
                confirmLabel="Start assessment"
                onConfirm={() => doClaim(false)}
              />
              <TooltipContent>Start assessment</TooltipContent>
            </Tooltip>
          )}
          {/* The pipe between the claim action and the read-only cluster. */}
          <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />
        </>
      )}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              nativeButton={false}
              aria-label={`Review ${project.name}`}
              render={<Link href={reviewHref} />}
            >
              <Eye aria-hidden className="size-4" />
            </Button>
          }
        />
        <TooltipContent>Review</TooltipContent>
      </Tooltip>

      <ProjectClaimConflictDialog
        conflict={conflict}
        targetName={project.name}
        isPending={isPending}
        onTransfer={() => startTransition(() => doClaim(true))}
        onClose={() => setConflict(null)}
      />
    </div>
  );
}
