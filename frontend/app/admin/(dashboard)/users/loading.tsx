import { UsersListSkeleton } from "@/modules/users/components/users-list-skeleton";

export default function UsersLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <UsersListSkeleton />
    </div>
  );
}
