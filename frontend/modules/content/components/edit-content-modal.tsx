"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ResourceModal } from "@/components/ui/resource-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ContentForm } from "@/modules/content/components/content-form";
import { EditContentModalSkeleton } from "@/modules/content/components/edit-content-modal-skeleton";
import { getContent, updateContent } from "@/modules/content/actions/content-actions";
import type { Content } from "@/types/content";

export function EditContentModal({ id, identifier }: { id: number; identifier: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function load() {
    setContent(null);
    setError(null);
    startTransition(async () => {
      const result = await getContent(id);
      if (result.ok) {
        setContent(result.data);
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
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${identifier}`}>
          <Pencil aria-hidden className="size-4" />
        </Button>
      }
      title="Edit content block"
      contentClassName="sm:max-w-[80vw] min-h-[80dvh] max-h-[90dvh]"
    >
      {error ? (
        <EmptyState
          title="Couldn't load this content block"
          description={error}
          action={<Button onClick={load}>Retry</Button>}
        />
      ) : content ? (
        <ContentForm
          submitLabel="Save changes"
          defaultValues={{
            identifier: content.identifier,
            title: content.meta?.title ?? "",
            body: content.body.en ?? "",
          }}
          onSubmit={(values) => updateContent(id, values)}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
            toast.success("Content block updated");
          }}
        />
      ) : (
        <EditContentModalSkeleton />
      )}
    </ResourceModal>
  );
}
