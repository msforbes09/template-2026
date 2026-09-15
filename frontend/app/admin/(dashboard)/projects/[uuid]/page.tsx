import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminProjectReview } from "@/modules/projects/components/admin-project-review";
import { ProjectDetailSkeleton } from "@/modules/projects/components/project-detail-skeleton";

export const metadata: Metadata = {
  title: "Review project",
  robots: { index: false, follow: false },
};

async function AdminProjectReviewForParams({
  params,
  searchParams,
}: {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ uuid }, { page = "1" }] = await Promise.all([params, searchParams]);
  return <AdminProjectReview uuid={uuid} reviewsPage={page} />;
}

export default function AdminProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  return (
    <div className="space-y-6">
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
      <Suspense fallback={<ProjectDetailSkeleton />}>
        <AdminProjectReviewForParams params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
