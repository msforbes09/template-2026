import Link from "next/link";
import { CalendarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function EgovEventNotFound() {
  return (
    <EmptyState
      icon={CalendarOff}
      title="Event not found"
      description="It may have been deleted."
      action={
        <Button variant="outline" nativeButton={false} render={<Link href="/admin/egov-events" />}>
          Back to events
        </Button>
      }
    />
  );
}
