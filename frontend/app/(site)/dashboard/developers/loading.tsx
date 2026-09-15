import { DeveloperAccessSkeleton } from "@/modules/site/components/developer-access";

export default function DevelopersLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-12 sm:px-6">
      <div aria-hidden className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <DeveloperAccessSkeleton />
    </div>
  );
}
