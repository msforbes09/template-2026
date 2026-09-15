"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ResourceModal } from "@/components/ui/resource-modal";
import { RoleForm } from "@/modules/access-control/components/role-form";
import { createRole } from "@/modules/access-control/actions/role-actions";

export function CreateRoleModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <ResourceModal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button className="gap-2">
          <Plus aria-hidden className="size-4" />
          Add role
        </Button>
      }
      title="Add role"
      description="Assign permissions to it afterwards from the roles list."
    >
      <RoleForm
        submitLabel="Create role"
        onSubmit={createRole}
        onSuccess={() => {
          setOpen(false);
          router.refresh();
          toast.success("Role created");
        }}
      />
    </ResourceModal>
  );
}
