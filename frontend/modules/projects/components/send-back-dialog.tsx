"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppFormField } from "@/components/ui/app-form-field";
import { Button } from "@/components/ui/button";
import { ResourceModal } from "@/components/ui/resource-modal";
import { Textarea } from "@/components/ui/textarea";
import { sendBackProject } from "@/modules/projects/actions/admin-project-actions";

// Sends a submission back to its owner with remarks. Remarks are the whole
// point of the action — they're the only thing the owner sees explaining what
// to fix — so the form won't submit without them, and the API's own 422 for
// the field is mapped back onto it.
export function SendBackDialog({ uuid }: { uuid: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const value = remarks.trim();
    if (!value) {
      setError("Tell the owner what needs to change.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await sendBackProject(uuid, value);
      if (result.ok) {
        setOpen(false);
        setRemarks("");
        router.refresh();
        toast.success("Sent back for changes");
        return;
      }
      setError(result.errors.assessment_remarks?.[0] ?? result.message);
    });
  }

  return (
    <ResourceModal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
      trigger={
        <Button variant="outline" className="gap-1.5">
          <RotateCcw aria-hidden className="size-4" />
          Send back
        </Button>
      }
      title="Send back for changes"
      description="The owner sees these remarks on their project and can edit and resubmit it."
    >
      <div className="space-y-4">
        <AppFormField
          label="Remarks"
          isRequired
          userInfo="Be specific — this is the only guidance the owner gets."
          error={error ?? undefined}
        >
          <Textarea
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            rows={6}
            placeholder="The demo video link is private, so we can't review it. Please make it unlisted or public and resubmit."
          />
        </AppFormField>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" disabled={isPending} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={isPending} onClick={submit} className="gap-1.5">
            {isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
            Send back
          </Button>
        </div>
      </div>
    </ResourceModal>
  );
}
