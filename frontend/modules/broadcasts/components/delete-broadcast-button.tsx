"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteBroadcast } from "@/modules/broadcasts/actions/broadcast-actions";

// Drafts only, creator only — both enforced by the API too. A soft delete, so
// the row simply leaves the history rather than appearing as a tombstone.
export function DeleteBroadcastButton({ id, title }: { id: number; title: string }) {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          <Trash2 data-icon="inline-start" />
          Delete
        </Button>
      }
      title="Delete this draft?"
      description={`"${title}" will be removed. Nothing has been sent, so no one is affected.`}
      confirmLabel="Delete draft"
      destructive
      onConfirm={async () => {
        const result = await deleteBroadcast(id);
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success("Draft deleted");
        router.refresh();
      }}
    />
  );
}
