import { FeatureFlagsListSkeleton } from "@/modules/feature-flags/components/feature-flags-list";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div aria-hidden className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-muted/60" />
      </div>
      <FeatureFlagsListSkeleton />
    </div>
  );
}
