"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ResourceModal } from "@/components/ui/resource-modal";
import { AdministratorForm } from "@/modules/administrators/components/administrator-form";
import { createAdministrator } from "@/modules/administrators/actions/administrator-actions";

export function CreateAdministratorModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <ResourceModal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button className="gap-2">
          <Plus aria-hidden className="size-4" />
          Add administrator
        </Button>
      }
      title="Add administrator"
      description="A temporary password will be generated and emailed to them."
    >
      <AdministratorForm
        submitLabel="Send invite"
        onSubmit={createAdministrator}
        onSuccess={() => {
          setOpen(false);
          router.refresh();
          toast.success("Administrator added");
        }}
      />
    </ResourceModal>
  );
}
