import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { NewProjectButton } from "@/modules/projects/components/new-project-button";
import { MyProjectsList } from "@/modules/projects/components/my-projects-list";
import { MyProjectsListSkeleton } from "@/modules/projects/components/my-projects-list-skeleton";

export const metadata: Metadata = {
  title: "My Projects",
  robots: { index: false, follow: false },
};

type ProjectsSearchParams = Promise<{ q?: string; status?: string; page?: string }>;

// Reads the searchParams promise itself, so awaiting it doesn't drag the
// static shell above (header, "New project" button) behind the route's
// loading boundary — only this Suspense-wrapped piece waits on it.
async function MyProjectsListForParams({
  searchParams,
}: {
  searchParams: ProjectsSearchParams;
}) {
  const { q = "", status = "", page = "1" } = await searchParams;
  return <MyProjectsList q={q} status={status} page={page} />;
}

export default function MyProjectsPage({
  searchParams,
}: {
  searchParams: ProjectsSearchParams;
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader
        title="My Projects"
        description="Your entries for the eGov Hackathon 2026. Submit one for review and an administrator publishes it to the public showcase."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Developer-gated, so it reads the profile — its own boundary
                keeps the rest of this header static. No fallback: a control
                that may not exist shouldn't flash a placeholder. */}
            <Suspense fallback={null}>
              <NewProjectButton />
            </Suspense>
            {/* The showcase is where these entries end up, and it is the only
                place to see what everyone else has built — but nothing on this
                page pointed at it. Secondary to creating one, so it sits
                after the primary action. */}
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/projects" target="_blank" rel="noreferrer noopener" />}
              className="gap-1.5"
            >
              Browse public projects
              <ArrowUpRight aria-hidden className="size-4" />
            </Button>
          </div>
        }
      />
      <Suspense fallback={<MyProjectsListSkeleton />}>
        <MyProjectsListForParams searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
