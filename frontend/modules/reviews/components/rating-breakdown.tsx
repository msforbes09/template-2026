import { Star } from "lucide-react";
import { RatingSummary } from "@/modules/reviews/components/star-rating";
import { breakdownRows, hasRating, type Rateable } from "@/modules/reviews/lib/rating";
import type { RatingBreakdown } from "@/types/project";

// The classic histogram beside the average, from the show endpoints' per-star
// counts. Renders nothing when there is nothing to break down: five empty bars
// say less than the "No ratings yet" line the section header already carries.
export function RatingBreakdownBars({
  subject,
  breakdown,
}: {
  subject: Rateable;
  breakdown: RatingBreakdown | undefined;
}) {
  if (!hasRating(subject) || !breakdown) return null;
  const rows = breakdownRows(breakdown);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:gap-8">
      <div className="shrink-0 text-center sm:w-32">
        <p className="text-4xl font-semibold tracking-tight">
          {(subject.rating_avg ?? 0).toFixed(1)}
        </p>
        <RatingSummary subject={subject} className="mt-1 justify-center" size="sm" />
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {rows.map((row) => (
          <li key={row.stars} className="flex items-center gap-3">
            <span className="inline-flex w-10 shrink-0 items-center justify-end gap-0.5 text-xs text-muted-foreground">
              {row.stars}
              <Star aria-hidden className="size-3 fill-muted-foreground/40 text-muted-foreground/40" />
            </span>
            <span
              aria-hidden
              className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
            >
              <span
                className="block h-full rounded-full bg-sun transition-[width] duration-500"
                style={{ width: `${row.fraction * 100}%` }}
              />
            </span>
            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {row.count}
            </span>
            <span className="sr-only">
              {row.count} {row.count === 1 ? "review" : "reviews"} rated {row.stars} out of 5
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
