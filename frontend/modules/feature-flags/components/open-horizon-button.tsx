import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openHorizon } from "@/modules/feature-flags/actions/horizon-actions";

// A form so the server action's redirect carries the browser straight into the
// Horizon dashboard. Rendered only once the developer-only fetch succeeded.
export function OpenHorizonButton() {
  return (
    <form action={openHorizon}>
      <Button type="submit" variant="outline">
        <ExternalLink aria-hidden className="size-4" />
        Open Horizon
      </Button>
    </form>
  );
}
