import { AdministratorsListSkeleton } from "@/modules/administrators/components/administrators-list-skeleton";

export default function AdministratorsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <AdministratorsListSkeleton />
    </div>
  );
}
