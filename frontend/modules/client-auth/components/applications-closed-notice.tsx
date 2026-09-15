import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

// The one place the "applications are off" message is written.
//
// Rendered wherever the "Apply as a developer" button would otherwise be
// (the `developer_applications` feature flag) — the dashboard journey's third
// step and the developer-only placeholders. A control that simply vanishes
// reads as a broken page, so the notice takes its place rather than leaving a
// gap.
//
// `role="status"` rather than "alert": nothing has gone wrong and nothing is
// urgent — it is the state of the portal, announced politely. Amber is this
// app's established "waiting on somebody else" tone (see the project
// assessment lock and the dashboard's contact nudge).
//
// Presentational and server-safe on purpose: it reads no env itself, so each
// caller decides WHEN it shows and this only decides what it says.
//
// It deliberately takes no "what were you reaching for" prop: both callers
// already name that immediately above it — the journey step's title and the
// placeholder's heading — so a second mention would just repeat itself.
export function ApplicationsClosedNotice({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-700 dark:text-amber-400",
        className,
      )}
    >
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">
          Applying as a developer isn&apos;t available at the moment
        </p>
        <p className="mt-0.5 leading-relaxed">
          Developer applications are temporarily closed. Your account stays
          fully active — you can still rate, test and review projects on the
          showcase — and applying opens again once they reopen.
        </p>
      </div>
    </div>
  );
}
