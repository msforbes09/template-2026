import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <EmptyState
      icon={FileQuestion}
      title="That draft isn't editable"
      description="It was deleted, or it has already started — a broadcast becomes immutable history the moment delivery begins."
      action={
        <Button variant="outline" nativeButton={false} render={<Link href="/admin/broadcasts" />}>
          Back to broadcasts
        </Button>
      }
    />
  );
}
