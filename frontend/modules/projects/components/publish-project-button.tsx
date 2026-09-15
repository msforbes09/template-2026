"use client";

import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { publishProject } from "@/modules/projects/actions/admin-project-actions";

// Freezes the working copy as the public snapshot. Needs the project to be in
// for_assessment/for_publishing AND claimed by this admin — the review screen
// only renders it when both hold.
export function PublishProjectButton({
  uuid,
  isRepublish,
}: {
  uuid: string;
  // Publishing again replaces a version that's already public, which is worth
  // saying out loud.
  isRepublish: boolean;
}) {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <Button className="gap-1.5">
          <Globe aria-hidden className="size-4" />
          {isRepublish ? "Publish update" : "Publish"}
        </Button>
      }
      title={isRepublish ? "Publish this version?" : "Publish this project?"}
      description={
        isRepublish
          ? "The current working copy replaces what's public now. The previous published version is not kept."
          : "A copy of the working copy is frozen and published to the public showcase."
      }
      confirmLabel="Publish"
      onConfirm={async () => {
        const result = await publishProject(uuid);
        if (result.ok) {
          router.refresh();
          toast.success(isRepublish ? "Update published" : "Project published");
        } else {
          toast.error(result.message);
        }
      }}
    />
  );
}
