"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteEgovEvent } from "@/modules/egov-events/actions/egov-event-actions";

export function DeleteEgovEventDialog({ id, name }: { id: number; name: string }) {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${name}`}>
          <Trash2 aria-hidden className="size-4" />
        </Button>
      }
      title="Delete this event?"
      description={`${name} will be removed, and its public page along with it. Projects entered into it are not deleted, but they stop appearing under it.`}
      confirmLabel="Delete"
      destructive
      onConfirm={async () => {
        const result = await deleteEgovEvent(id);
        if (result.ok) {
          router.refresh();
          toast.success("Event deleted");
        } else {
          toast.error(result.message);
        }
      }}
    />
  );
}
