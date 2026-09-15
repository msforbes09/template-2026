import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ASSESSMENT_LOCK_MESSAGE,
  isLockedByAssessment,
} from "@/modules/projects/lib/project-status";
import { apiFetch } from "@/lib/api-client";
import { isMissingProjectError } from "@/modules/projects/lib/project-errors";
import { requireClientSession } from "@/lib/auth/dal";
import { EditProjectForm } from "@/modules/projects/components/edit-project-form";
import { ProjectFormSkeleton } from "@/modules/projects/components/project-form-skeleton";
import { getPublicApiCatalogs } from "@/modules/site/lib/get-public-api-catalog";
import type { Project } from "@/types/project";
import { safeErrorMessage } from "@/lib/safe-error-message";

export const metadata: Metadata = {
  title: "Edit project",
  robots: { index: false, follow: false },
};

async function EditProjectFormSection({ params }: { params: Promise<{ uuid: string }> }) {
  await requireClientSession();
  const { uuid } = await params;

  let project: Project;
  try {
    const response = await apiFetch<{ data: Project }>(
      `/projects/${uuid}`,
      { next: { tags: [`projects:${uuid}`] } },
      "client",
    );
    project = response.data;
  } catch (err) {
    if (isMissingProjectError(err)) notFound();
    const message = safeErrorMessage(err, "Something went wrong loading this project.");
    return <EmptyState icon={AlertTriangle} title="Couldn't load this project" description={message} />;
  }

  // A claimed project cannot be saved (400 project_under_assessment), and the
  // list hides the Edit control — but this URL is bookmarkable, so the guard
  // has to exist here too rather than only on the way in.
  if (isLockedByAssessment(project)) {
    return (
      <EmptyState
        icon={Lock}
        title="This project is being reviewed"
        description={ASSESSMENT_LOCK_MESSAGE}
        action={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/dashboard/projects/${project.uuid}`} />}
          >
            Back to the project
          </Button>
        }
      />
    );
  }

  // The picker validates against the live catalogue; fetched after the
  // project so a catalogue blip doesn't cost the whole form.
  const catalogs = await getPublicApiCatalogs();
  return <EditProjectForm project={project} catalogs={catalogs} />;
}

export default async function EditProjectPage({ params }: { params: Promise<{ uuid: string }> }) {
  // Back to the project's own page — an edit starts from the show, so
  // finishing (or bailing) should land back on it, not on the listing.
  const { uuid } = await params;
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <Link
        href={`/dashboard/projects/${uuid}`}
        className="group -ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft
          aria-hidden
          className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
        />
        Back to the project
      </Link>
      <PageHeader
        title="Edit project"
        description="Changes go through review before they replace what's published."
      />
      <Suspense fallback={<ProjectFormSkeleton />}>
        <EditProjectFormSection params={params} />
      </Suspense>
    </div>
  );
}
