import { AdminProjectsListSkeleton } from "@/modules/projects/components/admin-projects-list-skeleton";

export default function AdminProjectsLoading() {
  return (
    <div className="space-y-6">
      <div aria-hidden className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <AdminProjectsListSkeleton />
    </div>
  );
}
