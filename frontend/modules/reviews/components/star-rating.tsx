import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatRating,
  hasRating,
  ratingCount,
  ratingLabel,
  starFills,
  type Rateable,
} from "@/modules/reviews/lib/rating";

// Stars are decorative: the rating is announced once, as text, on the wrapper.
// Rendering five separate "star" images to a screen reader says nothing useful
// and says it five times.
function Stars({ average, size = "default" }: { average: number; size?: "default" | "sm" }) {
  const dimension = size === "sm" ? "size-3.5" : "size-4";
  return (
    <span aria-hidden className="inline-flex items-center gap-0.5">
      {starFills(average).map((fill, index) => (
        <span key={index} className="relative inline-flex">
          <Star className={cn(dimension, "text-muted-foreground/25")} />
          {fill > 0 && (
            // A partial star is the filled glyph clipped to the fraction, so a
            // 4.5 reads as half rather than rounding up to a lie.
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star className={cn(dimension, "fill-sun text-sun")} />
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

// The compact form for cards and headers: stars, the average, the count.
export function RatingSummary({
  subject,
  size = "default",
  className,
  emptyLabel,
}: {
  subject: Rateable;
  size?: "default" | "sm";
  className?: string;
  // What to show when nothing has been rated. Omit it to render nothing at
  // all, which is what a dense card wants.
  emptyLabel?: string;
}) {
  if (!hasRating(subject)) {
    return emptyLabel ? (
      <span className={cn("text-xs text-muted-foreground", className)}>{emptyLabel}</span>
    ) : null;
  }

  const count = ratingCount(subject);
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Stars average={subject.rating_avg ?? 0} size={size} />
      <span className={cn("font-medium", size === "sm" ? "text-xs" : "text-sm")}>
        {formatRating(subject)}
      </span>
      <span className={cn("text-muted-foreground", size === "sm" ? "text-xs" : "text-sm")}>
        ({count})
      </span>
      <span className="sr-only">{ratingLabel(subject)}</span>
    </span>
  );
}

// A single review's own score, where the average and count would be noise.
export function ReviewStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center">
      <Stars average={rating} size="sm" />
      <span className="sr-only">{rating} out of 5</span>
    </span>
  );
}
