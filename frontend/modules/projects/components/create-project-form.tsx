"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProjectForm } from "@/modules/projects/components/project-form";
import { createProject } from "@/modules/projects/actions/client-project-actions";
import { uploadClientPrivateFile } from "@/modules/uploads/actions/upload-actions";
import { EMPTY_PROJECT_VALUES } from "@/modules/projects/schemas/project-schema";
import type { PublicApiCatalogItem } from "@/types/public-api-catalog";
import type { EgovEvent } from "@/types/project";

export function CreateProjectForm({
  catalogs,
  events,
}: {
  catalogs: PublicApiCatalogItem[];
  events: EgovEvent[];
}) {
  const router = useRouter();

  return (
    <ProjectForm
      catalogs={catalogs}
      defaultValues={EMPTY_PROJECT_VALUES}
      events={events}
      uploadAction={uploadClientPrivateFile}
      onSubmit={createProject}
      onSuccess={(project) => {
        // Lands on the project's own page, where the "Submit for review"
        // control is — creating it doesn't submit it.
        toast.success("Project saved as a draft");
        router.push(`/dashboard/projects/${project.uuid}`);
      }}
      submitLabel="Save draft"
      secondaryAction={
        <Button variant="ghost" nativeButton={false} render={<Link href="/dashboard/projects" />}>
          Cancel
        </Button>
      }
    />
  );
}
