"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProjectForm } from "@/modules/projects/components/project-form";
import { createAdminProject } from "@/modules/projects/actions/admin-project-actions";
import { uploadPrivateFile } from "@/modules/uploads/actions/upload-actions";
import { EMPTY_PROJECT_VALUES } from "@/modules/projects/schemas/project-schema";
import type { PublicApiCatalogItem } from "@/types/public-api-catalog";
import type { AdminEgovEvent } from "@/types/project";

export function CreateAdminProjectForm({
  catalogs,
  events,
}: {
  catalogs: PublicApiCatalogItem[];
  events: AdminEgovEvent[];
}) {
  const router = useRouter();

  return (
    <ProjectForm
      catalogs={catalogs}
      defaultValues={EMPTY_PROJECT_VALUES}
      events={events}
      eventFieldHint="Which programme this project belongs to. Administrators can change this later, and may pick a closed event."
      uploadAction={uploadPrivateFile}
      onSubmit={createAdminProject}
      onSuccess={(project) => {
        // Admin-created projects land as `for_publishing`, claimed by their
        // creator — they are NOT live until published from the review screen.
        toast.success("Project created — publish it to make it public");
        router.push(`/admin/projects/${project.uuid}`);
      }}
      submitLabel="Create project"
      showGallery
      secondaryAction={
        <Button variant="ghost" nativeButton={false} render={<Link href="/admin/projects" />}>
          Cancel
        </Button>
      }
    />
  );
}
