"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteContent } from "@/modules/content/actions/content-actions";

export function DeleteContentDialog({ id, identifier }: { id: number; identifier: string }) {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${identifier}`}>
          <Trash2 aria-hidden className="size-4" />
        </Button>
      }
      title="Delete content block?"
      description={`Any page referencing "${identifier}" will lose this content.`}
      confirmLabel="Delete"
      destructive
      onConfirm={async () => {
        const result = await deleteContent(id);
        if (result.ok) {
          router.refresh();
          toast.success("Content block deleted");
        } else {
          toast.error(result.message);
        }
      }}
    />
  );
}
