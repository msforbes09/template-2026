import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Can } from "@/modules/admin/components/can";
import { PERMISSIONS } from "@/modules/admin/lib/admin-can";
import { AdminProjectsList } from "@/modules/projects/components/admin-projects-list";
import { AdminProjectsListSkeleton } from "@/modules/projects/components/admin-projects-list-skeleton";

export const metadata: Metadata = {
  title: "Projects",
  robots: { index: false, follow: false },
};

type AdminProjectsSearchParams = Promise<{
  q?: string;
  status?: string;
  is_published?: string;
  is_assessment_started?: string;
  claimed?: string;
  egov_event_id?: string;
  page?: string;
}>;

// Reads the searchParams promise itself so awaiting it doesn't push the
// static shell behind the route's loading boundary.
async function AdminProjectsListForParams({
  searchParams,
}: {
  searchParams: AdminProjectsSearchParams;
}) {
  const {
    q = "",
    status = "",
    is_published = "",
    is_assessment_started = "",
    claimed = "",
    egov_event_id = "",
    page = "1",
  } = await searchParams;
  return (
    <AdminProjectsList
      q={q}
      status={status}
      isPublished={is_published}
      isAssessmentStarted={is_assessment_started}
      claimed={claimed}
      egovEventId={egov_event_id}
      page={page}
    />
  );
}

export default function AdminProjectsPage({
  searchParams,
}: {
  searchParams: AdminProjectsSearchParams;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Hackathon entries. Claim a submission to assess it, then publish it to the public showcase or send it back with remarks."
        action={
          <Can permission={PERMISSIONS.projectsManage}>
            <Button
              nativeButton={false}
              render={<Link href="/admin/projects/new" />}
              className="gap-1.5"
            >
              <Plus aria-hidden className="size-4" />
              New project
            </Button>
          </Can>
        }
      />
      <Suspense fallback={<AdminProjectsListSkeleton />}>
        <AdminProjectsListForParams searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
