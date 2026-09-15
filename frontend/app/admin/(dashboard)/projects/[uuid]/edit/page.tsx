import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api-client";
import { isMissingProjectError } from "@/modules/projects/lib/project-errors";
import { requireAdminSession } from "@/lib/auth/dal";
import { EditAdminProjectForm } from "@/modules/projects/components/edit-admin-project-form";
import { ProjectFormSkeleton } from "@/modules/projects/components/project-form-skeleton";
import { getPublicApiCatalogs } from "@/modules/site/lib/get-public-api-catalog";
import { getEgovEventOptions } from "@/modules/egov-events/actions/egov-event-actions";
import type { AdminProject } from "@/types/project";
import { safeErrorMessage } from "@/lib/safe-error-message";

export const metadata: Metadata = {
  title: "Edit project",
  robots: { index: false, follow: false },
};

async function EditAdminProjectSection({ params }: { params: Promise<{ uuid: string }> }) {
  await requireAdminSession();
  const { uuid } = await params;

  let project: AdminProject;
  try {
    const response = await apiFetch<{ data: AdminProject }>(
      `/projects/${uuid}`,
      { next: { tags: [`projects:${uuid}`] } },
      "admin",
    );
    project = response.data;
  } catch (err) {
    if (isMissingProjectError(err)) notFound();
    const message = safeErrorMessage(err, "Something went wrong loading this project.");
    return <EmptyState icon={AlertTriangle} title="Couldn't load this project" description={message} />;
  }

  const [catalogs, events] = await Promise.all([getPublicApiCatalogs(), getEgovEventOptions()]);
  return <EditAdminProjectForm project={project} catalogs={catalogs} events={events} />;
}

export default async function EditAdminProjectPage({ params }: { params: Promise<{ uuid: string }> }) {
  // Back to the project's own review — an edit starts from the show, so
  // finishing (or bailing) should land back on it, not on the listing.
  const { uuid } = await params;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/admin/projects/${uuid}`}
        className="group -ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft
          aria-hidden
          className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
        />
        Review
      </Link>
      <PageHeader
        title="Edit project"
        description="Editing claims the project for you and queues it for publishing."
      />
      <Suspense fallback={<ProjectFormSkeleton />}>
        <EditAdminProjectSection params={params} />
      </Suspense>
    </div>
  );
}
