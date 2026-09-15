"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { deleteGalleryImage } from "@/modules/gallery/actions/gallery-actions";

export function DeleteGalleryImageDialog({
  uuid,
  name,
  className,
}: {
  uuid: string;
  name: string;
  // Overrides the trigger's default styling — GalleryCard renders it over a
  // dark image overlay, so the base white-on-dark styling needs a light-bg override elsewhere.
  className?: string;
}) {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${name}`}
          className={cn("text-white hover:bg-white/20 hover:text-white", className)}
        >
          <Trash2 aria-hidden className="size-4" />
        </Button>
      }
      title="Delete image?"
      description={`"${name}" will be removed from the gallery. This can't be undone.`}
      confirmLabel="Delete"
      destructive
      onConfirm={async () => {
        const result = await deleteGalleryImage(uuid);
        if (result.ok) {
          router.refresh();
          toast.success("Image deleted");
        } else {
          toast.error(result.message);
        }
      }}
    />
  );
}
