import { AdminLogsSkeleton } from "@/modules/admin-logs/components/admin-logs-states";

export default function ConnectionLogsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <AdminLogsSkeleton filters={2} />
    </div>
  );
}
