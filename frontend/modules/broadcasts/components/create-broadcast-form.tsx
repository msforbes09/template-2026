"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BroadcastForm } from "@/modules/broadcasts/components/broadcast-form";
import { createBroadcast } from "@/modules/broadcasts/actions/broadcast-actions";
import { EMPTY_BROADCAST_VALUES } from "@/modules/broadcasts/schemas/broadcast-schema";

// Creating only ever produces a DRAFT — nothing is delivered here. On success
// we land back on the history, where the draft's own Start button lives.
export function CreateBroadcastForm() {
  const router = useRouter();

  return (
    <BroadcastForm
      defaultValues={EMPTY_BROADCAST_VALUES}
      onSubmit={createBroadcast}
      onSuccess={() => {
        toast.success("Draft saved", { description: "Start it when you're ready." });
        router.push("/admin/broadcasts");
      }}
      submitLabel="Save draft"
      secondaryAction={
        <Button variant="ghost" nativeButton={false} render={<Link href="/admin/broadcasts" />}>
          Cancel
        </Button>
      }
    />
  );
}
