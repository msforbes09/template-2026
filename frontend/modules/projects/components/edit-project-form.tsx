"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProjectForm } from "@/modules/projects/components/project-form";
import { updateProject } from "@/modules/projects/actions/client-project-actions";
import { uploadClientPrivateFile } from "@/modules/uploads/actions/upload-actions";
import { toProjectValues, toUploadedPhoto } from "@/modules/projects/lib/project-payload";
import { editResetsReview } from "@/modules/projects/lib/project-status";
import type { ProjectValues } from "@/modules/projects/schemas/project-schema";
import type { PublicApiCatalogItem } from "@/types/public-api-catalog";
import type { Project } from "@/types/project";

export function EditProjectForm({
  project,
  catalogs,
}: {
  project: Project;
  catalogs: PublicApiCatalogItem[];
}) {
  const router = useRouter();
  const warnsAboutReview = editResetsReview(project.status, project.is_published);

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
      uploadAction={uploadClientPrivateFile}
      onSubmit={(values: ProjectValues) => updateProject(project.uuid, values)}
      onSuccess={() => {
        toast.success("Changes saved");
        // Refresh FIRST so this route's payload (and the key above) pick up
        // the saved record before the route is hidden.
        router.refresh();
        router.push(`/dashboard/projects/${project.uuid}`);
      }}
      submitLabel="Save changes"
      reviewWarning={
        warnsAboutReview
          ? project.is_published === 1
            ? "Saving moves this project back to a draft. Your published version stays public until you submit these changes and an administrator publishes them."
            : "Saving takes this project out of the review queue and back to a draft. You'll need to submit it again."
          : undefined
      }
      secondaryAction={
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href={`/dashboard/projects/${project.uuid}`} />}
        >
          Cancel
        </Button>
      }
    />
  );
}
