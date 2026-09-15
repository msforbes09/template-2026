"use client";

import Link from "next/link";
import { ArrowRight, Loader2, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// The one-claim conflict dialog, shared by the review screen's claim button
// and the list row's pin: the WS named the project already held; offer the
// transfer, the way to that review, or nothing — the same shape as the users
// transfer dialog. Stacked full-width, decisive action first — the labels
// carry project names and never fit one row without ragged wrapping.
export function ProjectClaimConflictDialog({
  conflict,
  targetName,
  isPending,
  onTransfer,
  onClose,
}: {
  // The held project blocking the claim; null keeps the dialog closed.
  conflict: { uuid: string; name: string } | null;
  // The project the admin is trying to claim.
  targetName: string;
  isPending: boolean;
  onTransfer: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={conflict !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>You&apos;re already assessing {conflict?.name}</DialogTitle>
          <DialogDescription>
            One assessment at a time: move your claim to {targetName} and{" "}
            {conflict?.name} is released for other administrators — or finish
            that one first.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {/* Primary, not destructive: it moves the admin's OWN claim —
              consequential but routine, and the description already says
              what gets released. */}
          <Button className="w-full" disabled={isPending} onClick={onTransfer}>
            {isPending ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Pin data-icon="inline-start" />
            )}
            Start assessing {targetName}
          </Button>
          {/* To the LIST filtered to the caller's own claim, the same rhythm
              as the users dialog's ?claimed=me. Closes the dialog as it
              navigates. */}
          <Button
            variant="outline"
            className="w-full"
            nativeButton={false}
            render={<Link href="/admin/projects?claimed=me" />}
            onClick={onClose}
          >
            <ArrowRight data-icon="inline-start" />
            Continue assessing {conflict?.name}
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
