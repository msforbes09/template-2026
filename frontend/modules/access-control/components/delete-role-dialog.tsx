"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteRole } from "@/modules/access-control/actions/role-actions";

export function DeleteRoleDialog({ id, name }: { id: number; name: string }) {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${name}`}>
          <Trash2 aria-hidden className="size-4" />
        </Button>
      }
      title="Delete role?"
      description={`Administrators assigned "${name}" will lose the permissions it grants.`}
      confirmLabel="Delete"
      destructive
      onConfirm={async () => {
        const result = await deleteRole(id);
        if (result.ok) {
          router.refresh();
          toast.success("Role deleted");
        } else {
          toast.error(result.message);
        }
      }}
    />
  );
}
