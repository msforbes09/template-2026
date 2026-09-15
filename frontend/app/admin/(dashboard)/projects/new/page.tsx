import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdminSession } from "@/lib/auth/dal";
import { CreateAdminProjectForm } from "@/modules/projects/components/create-admin-project-form";
import { ProjectFormSkeleton } from "@/modules/projects/components/project-form-skeleton";
import { getPublicApiCatalogs } from "@/modules/site/lib/get-public-api-catalog";
import { getEgovEventOptions } from "@/modules/egov-events/actions/egov-event-actions";

export const metadata: Metadata = {
  title: "New project",
  robots: { index: false, follow: false },
};

async function NewAdminProjectSection() {
  await requireAdminSession();
  const [catalogs, events] = await Promise.all([getPublicApiCatalogs(), getEgovEventOptions()]);
  return <CreateAdminProjectForm catalogs={catalogs} events={events} />;
}

export default function NewAdminProjectPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/projects"
        className="group -ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft
          aria-hidden
          className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
        />
        Projects
      </Link>
      <PageHeader
        title="New project"
        description="Created in the admin lane: it's claimed by you and queued for publishing, and stays off the public showcase until you publish it."
      />
      <Suspense fallback={<ProjectFormSkeleton />}>
        <NewAdminProjectSection />
      </Suspense>
    </div>
  );
}
