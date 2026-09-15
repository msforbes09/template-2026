import { EgovEventsListSkeleton } from "@/modules/egov-events/components/egov-events-list";

export default function EgovEventsLoading() {
  return (
    <div className="space-y-6">
      <div aria-hidden className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <EgovEventsListSkeleton />
    </div>
  );
}
