"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProjectForm } from "@/modules/projects/components/project-form";
import { updateAdminProject } from "@/modules/projects/actions/admin-project-actions";
import { uploadPrivateFile } from "@/modules/uploads/actions/upload-actions";
import { toProjectValues, toUploadedPhoto } from "@/modules/projects/lib/project-payload";
import type { ProjectValues } from "@/modules/projects/schemas/project-schema";
import type { PublicApiCatalogItem } from "@/types/public-api-catalog";
import type { AdminEgovEvent, AdminProject } from "@/types/project";

export function EditAdminProjectForm({
  project,
  catalogs,
  events,
}: {
  project: AdminProject;
  catalogs: PublicApiCatalogItem[];
  events: AdminEgovEvent[];
}) {
  const router = useRouter();

  return (
    <ProjectForm
      // Remount whenever the server record actually changed: the route stays
      // MOUNTED but hidden under cacheComponents, and RHF's defaultValues are
      // captured at first render — without this key, coming back to edit
      // after a save re-seeded the form from the ORIGINAL (pre-edit) values,
      // silently discarding the saved changes on the next submit.
      key={`${project.uuid}:${project.updated_at}`}
      catalogs={catalogs}
      defaultValues={toProjectValues(project)}
      defaultPhoto={toUploadedPhoto(project.photo)}
      uploadAction={uploadPrivateFile}
      events={events}
      eventFieldHint="Moving a project between events re-scopes it publicly straight away. It does not change its status or what is published."
      onSubmit={(values: ProjectValues) => updateAdminProject(project.uuid, values)}
      onSuccess={() => {
        toast.success("Changes saved");
        // Refresh FIRST so this route's payload (and the key above) pick up
        // the saved record before the route is hidden.
        router.refresh();
        router.push(`/admin/projects/${project.uuid}`);
      }}
      submitLabel="Save changes"
      showGallery
      reviewWarning={
        project.is_published === 1
          ? "Saving claims this project for you and queues it for publishing. What's public now stays public until you publish the update."
          : "Saving claims this project for you and moves it into the publishing queue."
      }
      secondaryAction={
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href={`/admin/projects/${project.uuid}`} />}
        >
          Cancel
        </Button>
      }
    />
  );
}
