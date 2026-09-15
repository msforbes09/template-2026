"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Pin, PinOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { claimConflict } from "@/modules/users/lib/claim-conflict";
import type { AdminUser } from "@/types/admin-user";
import { toggleUserAssessment } from "@/modules/users/actions/user-actions";

// Lives in the user-details modal (2026-09-03) alongside the other lifecycle
// actions, so it carries its label. The icon says which way the toggle goes:
// Pin claims (the record is pinned to this admin), PinOff releases. Confirmed
// like every other action: claiming locks the account to this admin, so a
// stray click quietly blocking colleagues deserves a dialog.
//
// One claim per admin: when the WS refuses the claim because another is held
// (assessment_already_in_progress), a SECOND dialog opens naming the held
// user, offering to move the claim (the transfer retry), jump to their
// record, or cancel — instead of a dead-end toast.
export function ToggleAssessmentButton({
  uuid,
  started,
  name,
  onUpdated,
  iconOnly = false,
}: {
  uuid: string;
  started: boolean;
  name: string;
  // The row renders this icon-only (ghost Pin, label in the tooltip); the
  // modal's assessment card keeps the labeled button.
  iconOnly?: boolean;
  // Hands the fresh record back to the details modal hosting this action.
  onUpdated?: (user: AdminUser) => void;
}) {
  const router = useRouter();
  const [isStarted, setIsStarted] = useState(started);
  // The held user blocking this claim; non-null opens the transfer dialog.
  const [conflict, setConflict] = useState<{ uuid: string; displayName: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const label = isStarted ? "Release assessment" : "Start assessment";

  async function toggle(transfer: boolean) {
    const result = await toggleUserAssessment(uuid, transfer);
    if (result.ok) {
      setConflict(null);
      onUpdated?.(result.data);
      setIsStarted(result.data.is_assessment_started === 1);
      router.refresh();
      toast.success(
        result.data.is_assessment_started === 1
          ? `Assessment started for ${name}`
          : `Assessment released for ${name}`,
      );
      return;
    }
    const held = claimConflict(result);
    if (held) {
      setConflict(held);
      return;
    }
    toast.error(result.message);
  }

  const confirm = (
    <>
      {iconOnly ? (
        /* The ROW keeps the confirmation — a stray click here would claim an
           account the admin hasn't even looked at. */
        <ConfirmDialog
          trigger={
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${label} for ${name}`}
                >
                  {isStarted ? (
                    <PinOff aria-hidden className="size-4" />
                  ) : (
                    <Pin aria-hidden className="size-4" />
                  )}
                </Button>
              }
            />
          }
          title={isStarted ? `Release the assessment of ${name}?` : `Start assessing ${name}?`}
          description={
            isStarted
              ? "Your claim is released. Any administrator can pick the account up and act on it."
              : "This claims the account for you — approvals, sanctions and the developer grant unlock, and other administrators can't act on it until you release it."
          }
          confirmLabel={isStarted ? "Release" : "Start assessment"}
          onConfirm={() => toggle(false)}
        />
      ) : (
        /* Inside the details modal no second dialog: the record IS the
           context, and the toggle is reversible — click fires the API. */
        <Button
          type="button"
          variant={isStarted ? "outline" : "default"}
          size="sm"
          className="gap-1.5"
          disabled={isPending}
          onClick={() => startTransition(() => toggle(false))}
        >
          {isPending ? (
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
          ) : isStarted ? (
            <PinOff aria-hidden className="size-3.5" />
          ) : (
            <Pin aria-hidden className="size-3.5" />
          )}
          {label}
        </Button>
      )}

      {/* The one-claim conflict: the WS named who is already held; offer the
          transfer, the way to that record, or nothing. */}
      <Dialog open={conflict !== null} onOpenChange={(open) => !open && setConflict(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You&apos;re already assessing {conflict?.displayName}</DialogTitle>
            <DialogDescription>
              One assessment at a time: move your claim to {name} and{" "}
              {conflict?.displayName}&apos;s assessment is released for other administrators —
              or finish theirs first.
            </DialogDescription>
          </DialogHeader>
          {/* Stacked full-width, decisive action first — the three labels
              carry names and never fit one row without ragged wrapping. The
              record link closes the dialog as it navigates, so coming back
              doesn't land on a stale modal. */}
          <div className="flex flex-col gap-2">
            {/* Primary, not destructive: it moves the admin's OWN claim —
                consequential but routine, and the description already says
                what gets released. */}
            <Button
              className="w-full"
              disabled={isPending}
              onClick={() => startTransition(() => toggle(true))}
            >
              {isPending ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Pin data-icon="inline-start" />
              )}
              Start assessing {name}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              nativeButton={false}
              render={<Link href="/admin/users?claimed=me" />}
              onClick={() => setConflict(null)}
            >
              <ArrowRight data-icon="inline-start" />
              Continue assessing {conflict?.displayName}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setConflict(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  if (!iconOnly) return confirm;
  return (
    <Tooltip>
      {confirm}
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
