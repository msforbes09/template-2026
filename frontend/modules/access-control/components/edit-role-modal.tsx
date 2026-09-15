"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ResourceModal } from "@/components/ui/resource-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { RoleForm } from "@/modules/access-control/components/role-form";
import { EditRoleModalSkeleton } from "@/modules/access-control/components/edit-role-modal-skeleton";
import { getRole, updateRole } from "@/modules/access-control/actions/role-actions";
import type { Role } from "@/types/access-control";

export function EditRoleModal({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function load() {
    setRole(null);
    setError(null);
    startTransition(async () => {
      const result = await getRole(id);
      if (result.ok) {
        setRole(result.data);
        return;
      }
      if (result.status === 401) {
        setOpen(false);
        router.push("/admin/login");
        return;
      }
      setError(result.message);
    });
  }

  return (
    <ResourceModal
      open={open}
      onOpenChange={setOpen}
      onOpen={load}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${name}`}>
          <Pencil aria-hidden className="size-4" />
        </Button>
      }
      title="Edit role"
    >
      {error ? (
        <EmptyState
          title="Couldn't load this role"
          description={error}
          action={<Button onClick={load}>Retry</Button>}
        />
      ) : role ? (
        <RoleForm
          submitLabel="Save changes"
          defaultValues={{ name: role.name, description: role.description ?? "" }}
          onSubmit={(values) => updateRole(id, values)}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
            toast.success("Role updated");
          }}
        />
      ) : (
        <EditRoleModalSkeleton />
      )}
    </ResourceModal>
  );
}
