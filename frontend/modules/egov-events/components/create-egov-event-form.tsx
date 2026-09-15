"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EgovEventForm } from "@/modules/egov-events/components/egov-event-form";
import { createEgovEvent } from "@/modules/egov-events/actions/egov-event-actions";
import { EMPTY_EVENT_VALUES } from "@/modules/egov-events/schemas/egov-event-schema";

export function CreateEgovEventForm() {
  const router = useRouter();
  return (
    <EgovEventForm
      defaultValues={EMPTY_EVENT_VALUES}
      onSubmit={createEgovEvent}
      onSuccess={() => {
        toast.success("Event created");
        router.push("/admin/egov-events");
      }}
      submitLabel="Create event"
      secondaryAction={
        <Button variant="ghost" nativeButton={false} render={<Link href="/admin/egov-events" />}>
          Cancel
        </Button>
      }
    />
  );
}
