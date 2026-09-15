"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EgovEventForm } from "@/modules/egov-events/components/egov-event-form";
import { updateEgovEvent } from "@/modules/egov-events/actions/egov-event-actions";
import { toUploadedPhoto } from "@/modules/projects/lib/project-payload";
import type { EgovEventValues } from "@/modules/egov-events/schemas/egov-event-schema";
import type { AdminEgovEvent } from "@/types/project";

export function EditEgovEventForm({ event }: { event: AdminEgovEvent }) {
  const router = useRouter();

  const defaults: EgovEventValues = {
    name: event.name,
    description: event.description ?? "",
    is_active: event.is_active === 1,
    // Optional on the payload until the backend change ships; absent
    // means published, which is the column default.
    is_published: event.is_published !== 0,
    starts_at: event.starts_at ?? "",
    ends_at: event.ends_at ?? "",
    photo_uuid: event.photo?.uuid ?? "",
    // Pretty-printed so a human can actually edit it.
    meta: event.meta ? JSON.stringify(event.meta, null, 2) : "",
    // Order matters: it is the order the public curation tabs render in.
    custom_tags: (event.custom_tags ?? []).map((tag) => ({
      name: tag.name,
      color: tag.color,
      icon: tag.icon,
    })),
  };

  return (
    <EgovEventForm
      defaultValues={defaults}
      defaultPhoto={toUploadedPhoto(event.photo)}
      onSubmit={(values: EgovEventValues) => updateEgovEvent(event.id, values)}
      onSuccess={() => {
        toast.success("Changes saved");
        router.push("/admin/egov-events");
      }}
      submitLabel="Save changes"
      secondaryAction={
        <Button variant="ghost" nativeButton={false} render={<Link href="/admin/egov-events" />}>
          Cancel
        </Button>
      }
    />
  );
}
