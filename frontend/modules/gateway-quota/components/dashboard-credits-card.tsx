import Link from "next/link";
import { PlatformBadge } from "@/modules/gateway-logs/components/platform-badge";
import { isDaily, poolTone } from "@/modules/gateway-quota/lib/credits";
import { formatNumber } from "@/lib/format-number";
import { cn } from "@/lib/utils";
import type { GatewayCredits } from "@/types/gateway-log";

// How many calls are left, on the dashboard itself. `credits` already rides
// along on GET /profile for an approved developer, so this costs no extra
// request.
//
// DELIBERATELY THIN. This sits under a full usage section that already carries
// the counts, the charts and a per-API table — so the one question left for
// this card is "how much have I got left, and where". One cell per API, one
// figure each: remaining over allowance, which states the proportion exactly
// where a bar only suggested it.
//
// The fuller treatment still exists where it belongs — the per-API meters on
// /dashboard/usage and on each catalog's own usage tab, which is also where a
// reader who wants the detail is already heading.
//
// Pools are listed rather than summed: they are isolated per partner, so a
// single total would be a lie (see types/gateway-log.ts).
export function DashboardCreditsCard({ credits }: { credits: GatewayCredits }) {
  if (!credits.length) return null;

  return (
    <section aria-labelledby="api-credits" className="rounded-xl border border-border bg-card p-6">
      {/* No header link: the Developer access section right below carries the
          same Credentials & catalog destination, and every tile here already
          links into its own catalog. */}
      <h2 id="api-credits" className="text-base font-semibold tracking-tight">
        API credits
      </h2>

      {/* Three across on desktop, two at tablet, stacked on mobile. Each cell
          links to its own catalog page's USAGE tab — the partner slug IS the
          catalog identifier, and the tab holds the full meter and the call
          log behind this number, same landing as a credit alert.

          No bar. remaining/allowance already carries the proportion exactly,
          and a bar beside it would be a second, vaguer copy of the same fact.
          Tone survives on the number itself, so an exhausted pool is still
          visible at a glance without one. */}
      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {credits.map((pool) => {
          const tone = poolTone(pool);
          return (
            <li key={pool.platform}>
              <Link
                href={`/dashboard/api-catalogs/${pool.platform}?tab=usage`}
                className={cn(
                  "block rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  tone === "empty" ? "border-destructive/30" : "border-border",
                )}
              >
                <PlatformBadge platform={pool.platform} />
                <p className="mt-2 text-sm tabular-nums">
                  {/* Spelled out for a screen reader, which would otherwise
                      read the slash as punctuation rather than "of". */}
                  <span className="sr-only">
                    {formatNumber(pool.remaining)} of {formatNumber(pool.allowance)} credits left
                    {isDaily(pool) ? ", resets daily" : ""}
                  </span>
                  <span aria-hidden>
                    <span
                      className={cn(
                        "font-semibold",
                        tone === "empty"
                          ? "text-destructive"
                          : tone === "low"
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-foreground",
                      )}
                    >
                      {formatNumber(pool.remaining)}
                    </span>
                    <span className="text-muted-foreground">
                      /{formatNumber(pool.allowance)}
                    </span>
                    {/* Marked, not dated. THAT a pool refills changes the
                        reader's next move; when is detail for the usage page. */}
                    {isDaily(pool) && (
                      <span className="ml-1.5 text-xs text-muted-foreground">daily</span>
                    )}
                  </span>
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* No alert here any more — it moved to the top of the dashboard page,
          where a failing pool is the first thing the developer reads. */}
    </section>
  );
}
