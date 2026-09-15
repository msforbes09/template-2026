"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ResourceModal } from "@/components/ui/resource-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { AdministratorForm } from "@/modules/administrators/components/administrator-form";
import { EditAdministratorModalSkeleton } from "@/modules/administrators/components/edit-administrator-modal-skeleton";
import {
  getAdministrator,
  updateAdministrator,
} from "@/modules/administrators/actions/administrator-actions";
import type { Administrator } from "@/types/administrator";

export function EditAdministratorModal({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [administrator, setAdministrator] = useState<Administrator | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function load() {
    setAdministrator(null);
    setError(null);
    startTransition(async () => {
      const result = await getAdministrator(id);
      if (result.ok) {
        setAdministrator(result.data);
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
      title="Edit administrator"
    >
      {error ? (
        <EmptyState
          title="Couldn't load this administrator"
          description={error}
          action={<Button onClick={load}>Retry</Button>}
        />
      ) : administrator ? (
        <AdministratorForm
          submitLabel="Save changes"
          defaultValues={{ ...administrator, photo_uuid: administrator.photo?.uuid ?? "" }}
          defaultPhoto={administrator.photo}
          onSubmit={(values) => updateAdministrator(id, values)}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
            toast.success("Administrator updated");
          }}
        />
      ) : (
        <EditAdministratorModalSkeleton />
      )}
    </ResourceModal>
  );
}
