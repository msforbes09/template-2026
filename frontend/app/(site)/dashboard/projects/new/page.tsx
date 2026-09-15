import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CreateProjectForm } from "@/modules/projects/components/create-project-form";
import { ProjectFormSkeleton } from "@/modules/projects/components/project-form-skeleton";
import { requireClientSession } from "@/lib/auth/dal";
import { getPublicApiCatalogs } from "@/modules/site/lib/get-public-api-catalog";
import { getEgovEvents } from "@/modules/projects/lib/get-public-projects";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { canCreateProjects } from "@/modules/client-auth/lib/account";
import { DeveloperOnlyNotice } from "@/modules/client-auth/components/developer-only-notice";

export const metadata: Metadata = {
  title: "New project",
  robots: { index: false, follow: false },
};

// Guard + the API catalogue the eGov-APIs picker needs. Both are awaited
// inside the Suspense boundary, never at the page root, so the header stays
// in the static shell.
async function NewProjectFormSection() {
  await requireClientSession();

  // Bookmarkable, so the gate has to live here too — the list's notice does
  // not cover somebody arriving straight at this URL.
  const profile = await getClientProfile();
  if (profile && !canCreateProjects(profile)) {
    return <DeveloperOnlyNotice profile={profile} what="Entering projects" />;
  }

  // MUST be filtered to active. The event directory lists past events too
  // since 2026-08-23, and the API 422s an inactive egov_event_id on create —
  // so an unfiltered picker would offer a choice that cannot be submitted.
  const [catalogs, events] = await Promise.all([
    getPublicApiCatalogs(),
    getEgovEvents({ isActive: true }),
  ]);
  return <CreateProjectForm catalogs={catalogs} events={events} />;
}

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <Link
        href="/dashboard/projects"
        className="group -ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft
          aria-hidden
          className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
        />
        My Projects
      </Link>
      {/* A project cannot be saved without a demo video and a live https link
          (`workingCopyRules` in the WS's StoreProjectRequest), so the header
          says so up front rather than promising a cheap start that the form
          then refuses. */}
      <PageHeader
        title="New project"
        description="You'll need a demo video and a live link before this can be saved. Nothing is public until you submit it and an administrator publishes it."
      />
      <Suspense fallback={<ProjectFormSkeleton />}>
        <NewProjectFormSection />
      </Suspense>
    </div>
  );
}
