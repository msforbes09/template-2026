"use client";

import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { submitProject } from "@/modules/projects/actions/client-project-actions";

// draft / for_resubmission → for_assessment. Confirmed rather than one-click:
// a submitted project can't be edited back into shape without going through
// review again.
export function SubmitProjectButton({
  uuid,
  isResubmission,
  isLive,
}: {
  uuid: string;
  isResubmission: boolean;
  // A live project's public page keeps showing the old version while the new
  // one is in review — worth saying before they submit, not after.
  isLive: boolean;
}) {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <Button className="gap-1.5">
          <Send aria-hidden className="size-4" />
          {isResubmission ? "Submit again" : "Submit for review"}
        </Button>
      }
      title={isResubmission ? "Submit this project again?" : "Submit this project for review?"}
      description={
        isLive
          ? "An administrator will review your changes. Your current published version stays public until they publish the new one, and you can't edit while it's under review."
          : "An administrator will review it and decide whether to publish it to the public showcase. You can't edit it while it's under review."
      }
      confirmLabel="Submit"
      onConfirm={async () => {
        const result = await submitProject(uuid);
        if (result.ok) {
          router.refresh();
          toast.success("Submitted for review");
        } else {
          toast.error(result.message);
        }
      }}
    />
  );
}
