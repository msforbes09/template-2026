import { AlertTriangle, Gauge } from "lucide-react";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { CreditsMeter } from "@/modules/gateway-quota/components/credits-meter";
import { isDaily, poolTone } from "@/modules/gateway-quota/lib/credits";
import type { GatewayCreditPool } from "@/types/gateway-log";

// This catalog's own credit allowance, on its Usage tab.
//
// Credits became one pool per API catalog on 2026-08-24, which is what makes
// this worth showing here at all: the account-wide view lists every pool, but
// the number that decides whether the NEXT call on this page succeeds is this
// catalog's alone. A developer reading their eMessage usage does not care that
// eGovChain has 9,520 left.
//
// No platform chip — the route is already about this API, so naming it again
// would be noise. That is the one deliberate difference from CreditsPoolRow.
export function CatalogCreditsPanel({
  pool,
  title,
}: {
  pool: GatewayCreditPool;
  // The catalog's display name, so the copy reads as the page's own subject.
  title: string;
}) {
  const tone = poolTone(pool);
  const daily = isDaily(pool);

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3.5",
        tone === "empty" ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/30",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Gauge className="size-3.5" />
        </span>
        <h3 className="text-sm font-semibold tracking-tight">Your credits for this API</h3>
      </div>

      <CreditsMeter pool={pool} className="mt-3" />

      {tone !== "ok" && (
        <div
          role="alert"
          className={cn(
            "mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
            tone === "empty"
              ? "border-destructive/20 bg-destructive/10 text-destructive"
              : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
          )}
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <p>
            {tone === "empty" ? (
              <>
                You&apos;ve used your full {title} allowance — further calls to this API are
                rejected with a 429 before they reach it.{" "}
                {daily
                  ? `It resets at midnight${pool.resets_at ? ` (${formatDate(pool.resets_at)})` : ""}.`
                  : "Contact support to have it topped up."}{" "}
                Your other eGov APIs are unaffected.
              </>
            ) : (
              <>
                You&apos;re close to your {title} limit.{" "}
                {daily
                  ? `It resets at midnight${pool.resets_at ? ` (${formatDate(pool.resets_at)})` : ""}.`
                  : "Contact support to request more credits before calls start failing."}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
