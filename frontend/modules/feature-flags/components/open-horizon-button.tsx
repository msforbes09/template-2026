"use client";

import { useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getHorizonAccessUrl } from "@/modules/feature-flags/actions/horizon-actions";

// Opens the Horizon dashboard in a new tab. The tab is opened synchronously in
// the click handler, while the browser still counts it as a user gesture, and
// only pointed at the signed link once the server action returns — opening it
// after the await would trip popup blockers.
export function OpenHorizonButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const tab = window.open("about:blank", "_blank", "noopener");

    startTransition(async () => {
      const result = await getHorizonAccessUrl();

      if (result.ok && tab) {
        tab.location.href = result.data.url;
        return;
      }

      tab?.close();
      toast.error(result.ok ? "Your browser blocked the new tab." : result.message);
    });
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={isPending}>
      <ExternalLink aria-hidden className="size-4" />
      {isPending ? "Opening…" : "Open Horizon"}
    </Button>
  );
}
