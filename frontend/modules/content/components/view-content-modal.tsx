"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourceModal } from "@/components/ui/resource-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { EditContentModalSkeleton } from "@/modules/content/components/edit-content-modal-skeleton";
import { getContentPreview } from "@/modules/content/actions/content-actions";
import { cn } from "@/lib/utils";

// Compact prose styling for the sanitized preview. Deliberately NOT imported
// from content-block.tsx — that module imports the server-only sanitizer, so
// pulling its PROSE_CLASS into this client file would break the build.
const PREVIEW_PROSE = cn(
  "max-w-none text-sm leading-relaxed text-muted-foreground",
  "[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h2:first-child]:mt-0",
  "[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground",
  "[&_p]:mb-3 [&_p:last-child]:mb-0",
  "[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1",
  "[&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline",
);

// The view-only counterpart of EditContentModal, offered where the write
// actions are withheld (no contents-manage) so a viewer can still read what a
// block actually says. Same load-on-open pattern; the body arrives ALREADY
// sanitized from getContentPreview — this component never receives raw CMS
// markup to inject.
export function ViewContentModal({ id, identifier }: { id: number; identifier: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ title: string | null; html: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function load() {
    setPreview(null);
    setError(null);
    startTransition(async () => {
      const result = await getContentPreview(id);
      if (result.ok) {
        setPreview(result.data);
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
        <Button variant="ghost" size="icon-sm" aria-label={`View ${identifier}`}>
          <Eye aria-hidden className="size-4" />
        </Button>
      }
      title={preview?.title ?? "Content block"}
      contentClassName="sm:max-w-[70vw] max-h-[90dvh]"
    >
      {error ? (
        <EmptyState
          title="Couldn't load this content block"
          description={error}
          action={<Button onClick={load}>Retry</Button>}
        />
      ) : preview ? (
        <div className={PREVIEW_PROSE} dangerouslySetInnerHTML={{ __html: preview.html }} />
      ) : (
        <EditContentModalSkeleton />
      )}
    </ResourceModal>
  );
}
