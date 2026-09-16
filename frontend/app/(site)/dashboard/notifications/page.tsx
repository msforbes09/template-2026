import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { NotificationsList } from "@/modules/notifications/components/notifications-list";
import { NotificationsListSkeleton } from "@/modules/notifications/components/notifications-list-skeleton";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

type NotificationsSearchParams = Promise<{
  unread?: string;
  type?: string;
  page?: string;
}>;

// Reads the searchParams promise itself rather than awaiting it at the page
// root, so the header stays in the static shell and only this piece waits.
async function ListForParams({ searchParams }: { searchParams: NotificationsSearchParams }) {
  const { unread = "", type = "", page = "1" } = await searchParams;
  return <NotificationsList unread={unread === "1"} type={type} page={page} />;
}

export default function NotificationsPage({
  searchParams,
}: {
  searchParams: NotificationsSearchParams;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader
        title="Notifications"
        description="Reviews, approvals, credit warnings and announcements. Older than 12 months are removed automatically."
      />
      <Suspense fallback={<NotificationsListSkeleton />}>
        <ListForParams searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
