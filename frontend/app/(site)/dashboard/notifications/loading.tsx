import { PageHeader } from "@/components/ui/page-header";
import { NotificationsListSkeleton } from "@/modules/notifications/components/notifications-list-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader
        title="Notifications"
        description="Reviews, approvals, credit warnings and announcements. Older than 12 months are removed automatically."
      />
      <NotificationsListSkeleton />
    </div>
  );
}
