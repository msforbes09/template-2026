import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatNumber } from "@/lib/format-number";
import { PlatformBadge } from "@/modules/gateway-logs/components/platform-badge";
import { cn } from "@/lib/utils";
import { formatRate } from "@/modules/gateway-usage/lib/usage-metrics";
import type { UsageTopUser } from "@/types/gateway-usage";

// An integration failing this often is in trouble, whatever its volume.
const ERROR_RATE_ALARM = 0.1;

// Admin platform-wide only. Absent on a single-user drill — a one-row
// ranking of the developer already named in the drill would say nothing.

// The busiest developers, each a way into their own breakdown.
// The same developers ranked by ERROR count — the by-calls list above can
// hide a low-volume integration that fails most of the time. An empty list
// is good news and says so.
export function TopErrorUsersTable({
  users,
  hrefFor,
  windowCalls,
}: {
  users: UsageTopUser[];
  hrefFor: (userUuid: string) => string;
  // The window's TOTAL calls: each share is of all traffic, so it reads
  // against the headline tiles ("this developer's failures are 12% of
  // everything the gateway handled").
  windowCalls: number;
}) {
  return (
    <section
      aria-labelledby="usage-top-error-users-heading"
      className="rounded-xl border border-border bg-card p-5"
    >
      <h3 id="usage-top-error-users-heading" className="text-sm font-semibold tracking-tight">
        Most errors
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Developers ranked by errors, and each one&apos;s share of the window&apos;s traffic.
      </p>

      {users.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No developer hit an error in this window.
        </p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {users.map((user) => (
            <li key={user.user_uuid}>
              <Link
                href={hrefFor(user.user_uuid)}
                className="group flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {user.display_name ?? user.user_uuid}
                </span>
                {/* count · share of ALL traffic — same yardstick as Most
                    frequent errors, and the same 10%-of-traffic red rule. */}
                <span
                  className={cn(
                    "shrink-0 tabular-nums",
                    windowCalls > 0 && user.errors / windowCalls >= ERROR_RATE_ALARM
                      ? "font-medium text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {formatNumber(user.errors)} errors
                  {windowCalls > 0 && (
                    <span className="opacity-70">
                      {" "}
                      · {formatRate(user.errors / windowCalls, 1)} of traffic
                    </span>
                  )}
                </span>
                <ArrowRight
                  aria-hidden
                  className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function TopUsersTable({
  users,
  hrefFor,
  windowCalls,
}: {
  users: UsageTopUser[];
  // Builds the drill link, so the caller keeps the current window and platform
  // filter on the way in rather than resetting to the default.
  hrefFor: (userUuid: string) => string;
  // The window's total calls, for each developer's share of traffic.
  windowCalls: number;
}) {
  return (
    <section
      aria-labelledby="usage-top-users-heading"
      className="rounded-xl border border-border bg-card p-5"
    >
      <h3 id="usage-top-users-heading" className="text-sm font-semibold tracking-tight">
        Busiest developers
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Top 10 by call volume in this window. Open one for their own breakdown.
      </p>

      {users.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No developer made a call in this window.</p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {users.map((user, index) => (
            <li key={user.user_uuid}>
              <Link
                href={hrefFor(user.user_uuid)}
                className="group flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {/* The API may not have a name for every account; the uuid is
                      always there and is what the drill is keyed on anyway. */}
                  {user.display_name ?? user.user_uuid}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatNumber(user.calls)} calls
                  {/* The share matters for the heavy hitters; on row seven it
                      is a rounding error dressed as information. */}
                  {windowCalls > 0 && index < 3 && (
                    <span className="text-muted-foreground/60">
                      {" "}
                      · {formatRate(user.calls / windowCalls, 0)} of traffic
                    </span>
                  )}
                </span>
                {/* What they call most — "who is hammering which API" without
                    the drill. The word explains the chip; the chip's color
                    matches this API everywhere else on the page. Absent on
                    older payloads. */}
                {user.top_platform && (
                  <span className="flex shrink-0 items-center gap-1 text-muted-foreground/60">
                    mostly <PlatformBadge platform={user.top_platform} muted />
                  </span>
                )}
                {/* No error chip here — the Most errors table beside this one
                    owns that story now, with the same drill links. */}
                <ArrowRight
                  aria-hidden
                  className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

