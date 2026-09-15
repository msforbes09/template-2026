import { Fragment } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { creditAlertSummary } from "@/modules/gateway-quota/lib/credits";
import type { GatewayCredits } from "@/types/gateway-log";

// "a", "a and b", "a, b and c" — names bold so they scan.
function PlatformNames({ platforms }: { platforms: string[] }) {
  return (
    <>
      {platforms.map((platform, index) => (
        <Fragment key={platform}>
          {index > 0 && (index === platforms.length - 1 ? " and " : ", ")}
          <span className="font-medium">{platform}</span>
        </Fragment>
      ))}
    </>
  );
}

// The one thing a developer must not learn from a 429 mid-integration: that a
// pool is empty, or about to be. Rendered wherever credits are shown — the
// dashboard and the developers page both — so the warning cannot depend on
// which screen the reader happened to open.
//
// Renders nothing when every pool is healthy, so callers can drop it in
// unconditionally.
export function CreditsAlert({
  credits,
  className,
}: {
  credits: GatewayCredits | undefined;
  className?: string;
}) {
  // The whole warning as ONE line: names by state, then the single action.
  const summary = creditAlertSummary(credits);
  if (!summary) return null;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
        // An exhausted pool outranks a low one: calls are already failing.
        summary.exhausted.length > 0
          ? "border-destructive/20 bg-destructive/10 text-destructive"
          : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        className,
      )}
    >
      <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <p>
        {summary.exhausted.length > 0 && (
          <>
            <PlatformNames platforms={summary.exhausted} />{" "}
            {summary.exhausted.length === 1 ? "is" : "are"} out of credits
          </>
        )}
        {summary.exhausted.length > 0 && summary.low.length > 0 && "; "}
        {summary.low.length > 0 && (
          <>
            <PlatformNames platforms={summary.low} />{" "}
            {summary.low.length === 1 ? "is" : "are"} running low
          </>
        )}
        {". "}
        {summary.action}
      </p>
    </div>
  );
}
