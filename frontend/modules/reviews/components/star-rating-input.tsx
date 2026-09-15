"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];

// A radio group wearing stars. Native radios keep arrow-key navigation, form
// association and the required-ness for free; the stars are the visual layer
// on top, and each option carries a word as well as a count so the meaning
// does not depend on counting shapes.
export function StarRatingInput({
  value,
  onChange,
  name = "rating",
  "aria-describedby": ariaDescribedBy,
}: {
  value: number;
  onChange: (rating: number) => void;
  name?: string;
  "aria-describedby"?: string;
}) {
  // Hover preview is ephemeral UI state, not the value.
  const [preview, setPreview] = useState(0);
  const shown = preview || value;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="radiogroup"
        aria-label="Rating"
        aria-describedby={ariaDescribedBy}
        className="flex items-center gap-1"
        onMouseLeave={() => setPreview(0)}
      >
        {LABELS.map((label, index) => {
          const rating = index + 1;
          const filled = rating <= shown;
          return (
            <label
              key={rating}
              onMouseEnter={() => setPreview(rating)}
              className="cursor-pointer p-0.5"
            >
              <input
                type="radio"
                name={name}
                value={rating}
                checked={value === rating}
                onChange={() => onChange(rating)}
                className="sr-only peer"
              />
              <span className="sr-only">
                {rating} {rating === 1 ? "star" : "stars"} — {label}
              </span>
              <Star
                aria-hidden
                className={cn(
                  "size-7 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50 peer-focus-visible:rounded-sm",
                  filled ? "fill-sun text-sun" : "text-muted-foreground/30",
                )}
              />
            </label>
          );
        })}
      </div>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {shown ? LABELS[shown - 1] : "Select a rating"}
      </p>
    </div>
  );
}
