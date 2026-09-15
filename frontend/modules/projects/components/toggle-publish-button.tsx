"use client";

import { useRouter } from "next/navigation";
import { CloudOff, CloudUpload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toggleProjectPublish } from "@/modules/projects/actions/admin-project-actions";

// The visibility switch, separate from publishing. It flips `is_published`
// and NOTHING else — the status stays exactly where it was, so a hidden
// project is still an approved one and comes back unchanged. Available on
// anything published at least once (anything else answers 400
// invalid_status), and deliberately needs no claim: moderation must never be
// blocked by whoever happens to be assessing.
export function TogglePublishButton({ uuid, isLive }: { uuid: string; isLive: boolean }) {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" className="gap-1.5">
          {isLive ? (
            <CloudOff aria-hidden className="size-4" />
          ) : (
            <CloudUpload aria-hidden className="size-4" />
          )}
          {isLive ? "Hide from public" : "Make visible"}
        </Button>
      }
      title={isLive ? "Hide this project?" : "Make this project visible again?"}
      description={
        isLive
          ? "It disappears from the public showcase immediately. It stays approved and the published version is kept, so you can put it back at any time."
          : "The version published earlier becomes public again, exactly as it was."
      }
      confirmLabel={isLive ? "Hide" : "Make visible"}
      destructive={isLive}
      onConfirm={async () => {
        const result = await toggleProjectPublish(uuid);
        if (result.ok) {
          router.refresh();
          toast.success(isLive ? "Project hidden from the public" : "Project is visible again");
        } else {
          toast.error(result.message);
        }
      }}
    />
  );
}
