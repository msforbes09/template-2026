import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CRITERIA, MAX_RAW_SCORE, totalWeight } from "@/modules/hackathon/lib/criteria";

// Each criterion as a row whose weight is drawn to scale, not a spec table
// with a hairline under every line. The weights ARE the story here — 30 and 5
// carry very different consequences — and a bar says that in a way a column of
// numbers does not.
export function CriteriaList() {
  const total = totalWeight();

  return (
    <ol className="space-y-px overflow-hidden rounded-xl border border-border bg-border">
      {CRITERIA.map((criterion) => (
        <li key={criterion.name} className="bg-card p-6 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:gap-8">
            <div className="flex shrink-0 items-baseline gap-2 sm:w-28 sm:flex-col sm:items-start sm:gap-1">
              <span className="text-3xl font-semibold tracking-tight tabular-nums">
                {criterion.weight}
                <span className="text-lg text-muted-foreground">%</span>
              </span>
              {/* Drawn against the largest weight so the tallest bar is full,
                  making the comparison between criteria legible rather than
                  everything looking small next to 100. */}
              <span aria-hidden className="h-1.5 w-full max-w-24 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${(criterion.weight / 30) * 100}%` }}
                />
              </span>
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold tracking-tight">{criterion.name}</h3>
                {criterion.mandatory && (
                  <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
                    <Lock aria-hidden className="size-3" />
                    Required to qualify
                  </Badge>
                )}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {criterion.description}
              </p>
              {/* Marked as the judges' instruction rather than blended into the
                  description: entrants read it as "what they will check", which
                  is more useful than a rule addressed to someone else. */}
              <p className="border-l-2 border-primary/30 pl-3 text-sm leading-relaxed">
                <span className="font-medium">What judges check: </span>
                <span className="text-muted-foreground">{criterion.judgeGuide}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Minimum score to pass this criterion:{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {criterion.minimumRawScore} / {MAX_RAW_SCORE}
                </span>
              </p>
            </div>
          </div>
        </li>
      ))}
      <li className="flex items-center justify-between bg-muted/40 px-6 py-4 sm:px-7">
        <span className="text-sm font-medium">Total</span>
        <span className="text-sm font-semibold tabular-nums">{total}%</span>
      </li>
    </ol>
  );
}
