"use client";

import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { submitForAssessment } from "@/modules/client-auth/actions/profile-actions";
import { cn } from "@/lib/utils";

// Applying as a developer. Confirmed rather than one-click: submitting LOCKS
// the profile details until the review finishes, which is not obvious from
// the button alone. `variant` lets the journey stepper render it quietly
// (outline) where applying is optional, not the implied next step.
export function SubmitApplicationButton({
  isResubmission,
  variant = "default",
  className,
}: {
  isResubmission: boolean;
  variant?: "default" | "outline";
  className?: string;
}) {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant={variant} className={cn("gap-1.5", className)}>
          <Send aria-hidden className="size-3.5" />
          {isResubmission ? "Submit again" : "Apply as a developer"}
        </Button>
      }
      title={isResubmission ? "Submit your application again?" : "Apply as a developer?"}
      description={
        isResubmission
          ? "Your updated application goes back to the reviewers. Your profile details lock again while they look at it."
          : "A reviewer will look at your profile and decide whether to grant developer access, which unlocks API credentials and entering projects. Your profile details are locked while it's being reviewed."
      }
      confirmLabel="Submit"
      onConfirm={async () => {
        const result = await submitForAssessment();
        if (result.ok) {
          router.refresh();
          toast.success("Application submitted — we'll email you the outcome");
          return;
        }
        // The stale-tab case: applications were switched off
        // (the `developer_applications` flag) while this page was open, so this
        // button should no longer exist. Refreshing re-renders the journey
        // without it, which is the real fix — the toast only explains why it
        // vanished. Same `code` whichever half refused, frontend or backend.
        if (result.code === "applications_closed") {
          router.refresh();
          toast.error("Developer applications have closed. Your account is unchanged.");
          return;
        }
        toast.error(result.message);
      }}
    />
  );
}
