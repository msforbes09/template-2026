"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteAdministrator } from "@/modules/administrators/actions/administrator-actions";

export function DeleteAdministratorDialog({ id, name }: { id: number; name: string }) {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${name}`}>
          <Trash2 aria-hidden className="size-4" />
        </Button>
      }
      title="Delete administrator?"
      description={`This will remove ${name}'s access to the admin platform.`}
      confirmLabel="Delete"
      destructive
      onConfirm={async () => {
        const result = await deleteAdministrator(id);
        if (result.ok) {
          router.refresh();
          toast.success("Administrator deleted");
        } else {
          toast.error(result.message);
        }
      }}
    />
  );
}
