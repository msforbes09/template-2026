"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BroadcastForm } from "@/modules/broadcasts/components/broadcast-form";
import { updateBroadcast } from "@/modules/broadcasts/actions/broadcast-actions";
import { toBroadcastValues } from "@/modules/broadcasts/schemas/broadcast-schema";
import type { AdminBroadcast } from "@/types/broadcast";
import type { BroadcastValues } from "@/modules/broadcasts/schemas/broadcast-schema";

// Drafts only. A PUT replaces the targeting wholesale, so switching the
// audience back to Everyone genuinely widens it rather than leaving the old
// filters behind — which is why the form always sends a complete payload.
export function EditBroadcastForm({ broadcast }: { broadcast: AdminBroadcast }) {
  const router = useRouter();

  return (
    <BroadcastForm
      defaultValues={toBroadcastValues(broadcast)}
      onSubmit={(values: BroadcastValues) => updateBroadcast(broadcast.id, values)}
      onSuccess={() => {
        toast.success("Draft updated");
        router.push("/admin/broadcasts");
      }}
      submitLabel="Save changes"
      secondaryAction={
        <Button variant="ghost" nativeButton={false} render={<Link href="/admin/broadcasts" />}>
          Cancel
        </Button>
      }
    />
  );
}
