import { ContentsListSkeleton } from "@/modules/content/components/contents-list-skeleton";

export default function ContentsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <ContentsListSkeleton />
    </div>
  );
}
