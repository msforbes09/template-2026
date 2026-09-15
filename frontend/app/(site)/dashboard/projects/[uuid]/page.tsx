import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MyProjectDetail } from "@/modules/projects/components/my-project-detail";
import { ProjectDetailSkeleton } from "@/modules/projects/components/project-detail-skeleton";

export const metadata: Metadata = {
  title: "Project",
  robots: { index: false, follow: false },
};

// `params` is awaited inside the boundary, not in the page body — the same
// rule as searchParams: resolving it here would make the whole route dynamic
// and push the back link and container behind loading.tsx.
async function ProjectDetailForParams({
  params,
  searchParams,
}: {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ uuid }, { page = "1" }] = await Promise.all([params, searchParams]);
  return <MyProjectDetail uuid={uuid} reviewsPage={page} />;
}

export default function MyProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
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
      <Suspense fallback={<ProjectDetailSkeleton />}>
        <ProjectDetailForParams params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
