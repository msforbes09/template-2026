import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepperStep<T extends string = string> = { key: T; label: string };

export function Stepper<T extends string>({
  steps,
  current,
}: {
  steps: readonly StepperStep<T>[];
  current: T;
}) {
  const currentIndex = steps.findIndex((step) => step.key === current);

  return (
    <div>
      <p className="sr-only" aria-live="polite">
        Step {currentIndex + 1} of {steps.length}: {steps[currentIndex]?.label}
      </p>
      <ol aria-hidden className="flex items-center px-1">
        {steps.map((step, index) => (
          <li key={step.key} className="contents">
            {index > 0 && (
              <div
                className={cn(
                  "mx-2.5 h-px flex-1 rounded-full transition-colors",
                  index <= currentIndex ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <div className="flex flex-col items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  index < currentIndex && "bg-primary text-primary-foreground",
                  index === currentIndex &&
                    "bg-primary text-primary-foreground ring-4 ring-primary/15",
                  index > currentIndex && "bg-muted text-muted-foreground",
                )}
              >
                {index < currentIndex ? <Check aria-hidden className="size-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium transition-colors",
                  index <= currentIndex ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
