"use client";

import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUpdateSearchParams } from "@/hooks/use-update-search-params";
import {
  DEFAULT_USAGE_INTERVAL,
  INTERVAL_PRESET,
  USAGE_INTERVALS,
  resolveInterval,
} from "@/modules/gateway-usage/lib/usage-window";

// The window selector, in the URL like every other filter here — so a
// particular view can be linked to and survives a refresh.
//
// Buttons rather than links because there is no distinct path behind them,
// only a query param the page already reads (same reasoning as
// PublicProjectsTabs).
//
// Switching interval CLEARS any custom from/to: the two are coupled, since the
// API's accepted input format changes with the interval (`YYYY-MM-DD HH:mm`
// for hour, `YYYY-MM-DD` otherwise) and its cap changes too. Carrying a day
// range onto the hour view would be a guaranteed 422.
export function UsageIntervalToggle({ className }: { className?: string }) {
  const params = useSearchParams();
  const update = useUpdateSearchParams();
  const current = resolveInterval(params.get("interval"));

  return (
    <div
      role="group"
      aria-label="Usage window"
      className={cn("flex flex-wrap gap-1 rounded-lg border border-border p-1", className)}
    >
      {USAGE_INTERVALS.map((interval) => {
        const isCurrent = interval === current;
        return (
          <button
            key={interval}
            type="button"
            aria-pressed={isCurrent}
            onClick={() =>
              update(
                {
                  // The default is dropped from the URL rather than written
                  // out, keeping the page's plain address canonical.
                  interval: interval === DEFAULT_USAGE_INTERVAL ? null : interval,
                  from: null,
                  to: null,
                },
                { scroll: false },
              )
            }
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              isCurrent
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {INTERVAL_PRESET[interval].label}
          </button>
        );
      })}
    </div>
  );
}
