import { Badge } from "@/components/ui/badge";
import type { Reviewer } from "@/types/review";

// An approved developer account. Anonymous reviewers carry no reviewer block
// at all, so an anonymous developer stays unbadged — which is the point of
// choosing anonymity.
export function DeveloperBadge({ reviewer }: { reviewer: Reviewer | null }) {
  if (reviewer?.is_developer !== 1) return null;
  return (
    <Badge variant="secondary" className="bg-primary/10 text-primary">
      Developer
    </Badge>
  );
}
