import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Can } from "@/modules/admin/components/can";
import { PERMISSIONS } from "@/modules/admin/lib/admin-can";
import { CreateContentModal } from "@/modules/content/components/create-content-modal";
import { ContentsList } from "@/modules/content/components/contents-list";
import { ContentsListSkeleton } from "@/modules/content/components/contents-list-skeleton";

export const metadata: Metadata = {
  title: "Content Blocks",
  robots: { index: false, follow: false },
};

// Reads the searchParams promise itself — kept out of the page component so
// awaiting it doesn't force the whole page (including the static PageHeader
// below) behind the route's loading.tsx boundary. Only this Suspense-wrapped
// piece should wait on it (see searchparams_ppr_boundary memory).
async function ContentsListForParams({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  return <ContentsList q={q} page={page} />;
}

export default function ContentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Blocks"
        description="Manage reusable rich-text content blocks."
        action={
          <Can permission={PERMISSIONS.contentsManage}>
            <CreateContentModal />
          </Can>
        }
      />
      <Suspense fallback={<ContentsListSkeleton />}>
        <ContentsListForParams searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
