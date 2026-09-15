import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format-number";
import { filteredLogsHref } from "@/modules/gateway-usage/components/usage-breakdown";
import { formatRate } from "@/modules/gateway-usage/lib/usage-metrics";
import type { UsageByStatus } from "@/types/gateway-usage";

// Responses by status class, as ONE segmented proportion bar plus a row per
// class — not the earlier horizontal bar chart, whose axis labels ate a third
// of the width and whose legend restated every number the chart drew.
//
// The segment widths carry the mix at a glance; the rows underneath carry the
// exact figures as text and the drill-down into the filtered log list. One
// element per fact, nothing said twice, and no chart runtime for what is
// four percentages.
//
// Colours are by SEVERITY from the fixed status palette, never the categorical
// chart tokens, so a status colour cannot impersonate a series. 3xx is
// deliberately neutral: a redirect is neither good nor bad. Colour never
// carries the meaning alone — every row states its class and count as text.
const STATUS_ROWS = [
  { key: "2xx", label: "2xx Success", color: "#0ca30c" },
  { key: "3xx", label: "3xx Redirect", color: "var(--muted-foreground)" },
  { key: "4xx", label: "4xx Client error", color: "#fab219" },
  { key: "5xx", label: "5xx Server error", color: "#d03b3b" },
] as const;

export function UsageStatusBreakdown({
  byStatus,
  logsHref,
}: {
  byStatus: UsageByStatus;
  // Base path of the log viewer for this audience; each class row links to
  // the list filtered to its status class ("4xx" — the API expands classes
  // to ranges). Null renders plain rows.
  logsHref?: string | null;
}) {
  const rows = STATUS_ROWS.map((row) => ({
    ...row,
    count: byStatus[row.key] ?? 0,
  }));
  // Share of the classes shown, not of `calls` — an untyped status counts as
  // an error in the totals without landing in any class, so these would not
  // otherwise sum to 100%.
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <section
      aria-labelledby="usage-status-heading"
      className="rounded-xl border border-border bg-card p-5"
    >
      <h3 id="usage-status-heading" className="text-sm font-semibold tracking-tight">
        Responses by status
      </h3>

      {total === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No responses in this window.</p>
      ) : (
        <>
          {/* The mix, in one glance. Decorative — the rows below say the same
              thing as text — so it is hidden from the accessibility tree
              rather than described twice. A sliver of a non-zero class stays
              visible via the minimum width. */}
          <div
            aria-hidden
            className="mt-4 flex h-2.5 w-full gap-px overflow-hidden rounded-full"
          >
            {rows
              .filter((row) => row.count > 0)
              .map((row) => (
                <div
                  key={row.key}
                  className="min-w-1.5 rounded-[1px] first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${(row.count / total) * 100}%`, backgroundColor: row.color }}
                />
              ))}
          </div>

          <ul className="mt-3 space-y-0.5 text-sm">
            {rows.map((row) => {
              const zero = row.count === 0;
              const inner = (
                <>
                  <span
                    aria-hidden
                    className={cn("size-2 shrink-0 rounded-full", zero && "opacity-30")}
                    style={{ backgroundColor: row.color }}
                  />
                  <span className={cn("text-muted-foreground", zero && "opacity-60")}>
                    {row.label}
                  </span>
                  <span
                    className={cn(
                      "ml-auto tabular-nums",
                      zero ? "text-muted-foreground/60" : "text-foreground",
                    )}
                  >
                    {formatNumber(row.count)}
                    <span className="text-muted-foreground"> · {formatRate(row.count / total, 0)}</span>
                  </span>
                </>
              );

              // A zero row has no matching logs to open — it stays text.
              return (
                <li key={row.key}>
                  {logsHref && !zero ? (
                    <Link
                      href={filteredLogsHref(logsHref, row.key)}
                      className="-mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <span className="flex items-center gap-2.5 py-1.5">{inner}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
