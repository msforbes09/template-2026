"use client";

import { useMemo } from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { evaluatePasswordStrength, type StrengthLevel } from "@/lib/password-strength";

// A strength meter for a new-password field: four segments, a word for the
// score, and the criteria that would improve it.
//
// Advisory only. It never blocks a submit and never disagrees with validation —
// below the schema's minimum it stays at "Very weak" rather than showing an
// encouraging bar next to a "too short" error. The scoring lives in
// lib/password-strength.ts; this file is only how it looks.
//
// Renders nothing for an empty value, so an untouched form isn't shouting at
// someone before they've typed.

const SEGMENT_STYLES: Record<StrengthLevel, string> = {
  0: "bg-muted",
  1: "bg-destructive",
  2: "bg-amber-500",
  3: "bg-sky-500",
  4: "bg-emerald-500",
};

const LABEL_STYLES: Record<StrengthLevel, string> = {
  0: "text-muted-foreground",
  1: "text-destructive",
  2: "text-amber-600 dark:text-amber-400",
  3: "text-sky-600 dark:text-sky-400",
  4: "text-emerald-600 dark:text-emerald-400",
};

export function PasswordStrength({ value, className }: { value: string; className?: string }) {
  const strength = useMemo(() => evaluatePasswordStrength(value), [value]);

  if (strength.score === 0) return null;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden>
          {[1, 2, 3, 4].map((segment) => (
            <span
              key={segment}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                segment <= strength.score ? SEGMENT_STYLES[strength.score] : "bg-muted",
              )}
            />
          ))}
        </div>
        {/* The word, not just the colour — the bar alone would carry the whole
            meaning in hue, which fails anyone who can't distinguish them.
            aria-live on the label rather than the bar: it changes only when the
            score crosses a band, so it announces a handful of times instead of
            on every keystroke. */}
        <span
          role="status"
          aria-live="polite"
          className={cn("text-xs font-medium tabular-nums", LABEL_STYLES[strength.score])}
        >
          {strength.label}
        </span>
      </div>

      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {strength.criteria.map((criterion) => (
          <li
            key={criterion.id}
            className={cn(
              "flex items-center gap-1 text-xs",
              criterion.met ? "text-muted-foreground" : "text-muted-foreground/70",
            )}
          >
            {criterion.met ? (
              <Check aria-hidden className="size-3 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Circle aria-hidden className="size-3" />
            )}
            {criterion.label}
            {/* Met-ness is otherwise only in the icon and a colour shift. */}
            <span className="sr-only">{criterion.met ? " — done" : " — not yet"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
