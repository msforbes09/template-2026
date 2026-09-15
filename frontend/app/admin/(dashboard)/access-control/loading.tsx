import { RolesListSkeleton } from "@/modules/access-control/components/roles-list-skeleton";

export default function AccessControlLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <RolesListSkeleton />
    </div>
  );
}
