import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Can } from "@/modules/admin/components/can";
import { PERMISSIONS } from "@/modules/admin/lib/admin-can";
import {
  EgovEventsList,
  EgovEventsListSkeleton,
} from "@/modules/egov-events/components/egov-events-list";

export const metadata: Metadata = {
  title: "eGov Events",
  robots: { index: false, follow: false },
};

type EventsSearchParams = Promise<{
  q?: string;
  is_active?: string;
  is_published?: string;
  page?: string;
}>;

async function EgovEventsListForParams({ searchParams }: { searchParams: EventsSearchParams }) {
  const { q = "", is_active = "", is_published = "", page = "1" } = await searchParams;
  return (
    <EgovEventsList q={q} isActive={is_active} isPublished={is_published} page={page} />
  );
}

export default function EgovEventsPage({ searchParams }: { searchParams: EventsSearchParams }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="eGov Events"
        description="Programmes projects are entered into. An event's public page lists the projects entered into it."
        action={
          <Can permission={PERMISSIONS.egovEventsManage}>
            <Button
              nativeButton={false}
              render={<Link href="/admin/egov-events/new" />}
              className="gap-1.5"
            >
              <Plus aria-hidden className="size-4" />
              New event
            </Button>
          </Can>
        }
      />
      <Suspense fallback={<EgovEventsListSkeleton />}>
        <EgovEventsListForParams searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
