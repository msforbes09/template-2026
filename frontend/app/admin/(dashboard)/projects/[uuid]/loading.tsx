import { ProjectDetailSkeleton } from "@/modules/projects/components/project-detail-skeleton";

export default function AdminProjectLoading() {
  return (
    <div className="space-y-6">
      <div aria-hidden className="h-5 w-24 animate-pulse rounded bg-muted/60" />
      <ProjectDetailSkeleton />
    </div>
  );
}
