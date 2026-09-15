"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ResourceModal } from "@/components/ui/resource-modal";
import { ContentForm } from "@/modules/content/components/content-form";
import { createContent } from "@/modules/content/actions/content-actions";

export function CreateContentModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <ResourceModal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button className="gap-2">
          <Plus aria-hidden className="size-4" />
          Add content block
        </Button>
      }
      title="Add content block"
      description="Create a reusable, identifier-addressable block of rich content."
      contentClassName="sm:max-w-[80vw] min-h-[80dvh] max-h-[90dvh]"
    >
      <ContentForm
        submitLabel="Create content block"
        onSubmit={createContent}
        onSuccess={() => {
          setOpen(false);
          router.refresh();
          toast.success("Content block created");
        }}
      />
    </ResourceModal>
  );
}
