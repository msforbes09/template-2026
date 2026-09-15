import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Can } from "@/modules/admin/components/can";
import { PERMISSIONS } from "@/modules/admin/lib/admin-can";
import { BroadcastsList } from "@/modules/broadcasts/components/broadcasts-list";
import { BroadcastsListSkeleton } from "@/modules/broadcasts/components/broadcasts-list-skeleton";
import { BroadcastsGate } from "@/modules/broadcasts/components/broadcasts-gate";

export const metadata: Metadata = {
  title: "Broadcasts",
  robots: { index: false, follow: false },
};

type BroadcastsSearchParams = Promise<{ page?: string }>;

async function ListForParams({ searchParams }: { searchParams: BroadcastsSearchParams }) {
  const { page = "1" } = await searchParams;
  return (
    <BroadcastsGate>
      <BroadcastsList page={page} />
    </BroadcastsGate>
  );
}

export default function BroadcastsPage({
  searchParams,
}: {
  searchParams: BroadcastsSearchParams;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Broadcasts"
        description="Announcements pushed into users' notification bells. Composing saves a draft; delivery starts only when you say so."
        action={
          <Can permission={PERMISSIONS.notificationsBroadcast}>
            <Button
              nativeButton={false}
              render={<Link href="/admin/broadcasts/new" />}
              className="gap-1.5"
            >
              <Plus aria-hidden className="size-4" />
              New broadcast
            </Button>
          </Can>
        }
      />
      <Suspense fallback={<BroadcastsListSkeleton />}>
        <ListForParams searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
