"use client";

import { Badge } from "@/components/ui/badge";
import { useUpdateSearchParams } from "@/hooks/use-update-search-params";
import { platformTone } from "@/modules/gateway-logs/lib/platform-tone";
import { cn } from "@/lib/utils";

// The partner slug as a colour-coded chip — same colour for the same partner
// everywhere (see platform-tone.ts). With `filterable` it becomes a button
// that applies ?platform= to the current list; leave it off where the
// platform is pinned (the per-catalog usage tab) so a click never looks like
// it did nothing.
export function PlatformBadge({
  platform,
  filterable = false,
  muted = false,
  className,
}: {
  platform: string;
  filterable?: boolean;
  // Monochrome chip. The hue earns its place where rows are IDENTIFIED by
  // it (the log lists); on analytic surfaces it competed with the severity
  // colours, so those pass muted and let red/amber mean "look here" alone.
  muted?: boolean;
  className?: string;
}) {
  const update = useUpdateSearchParams();
  const tone = muted ? "text-muted-foreground" : platformTone(platform);

  if (filterable) {
    return (
      <Badge
        variant="outline"
        className={cn("cursor-pointer font-medium hover:brightness-95", tone, className)}
        title={`Show only ${platform}`}
        render={
          <button
            type="button"
            onClick={() => update({ platform }, { resetPage: true, scroll: false })}
          />
        }
      >
        {platform}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn("font-medium", tone, className)}>
      {platform}
    </Badge>
  );
}
