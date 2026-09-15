import { DashboardSkeleton } from "@/modules/admin/components/dashboard-content";

export default function AdminDashboardLoading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
      <DashboardSkeleton />
    </div>
  );
}
