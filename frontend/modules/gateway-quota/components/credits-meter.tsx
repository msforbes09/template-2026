import Link from "next/link";
import { Gauge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format-date";
import { formatNumber } from "@/lib/format-number";
import { cn } from "@/lib/utils";
import { PlatformBadge } from "@/modules/gateway-logs/components/platform-badge";
import { isDaily, poolTone, usedRatio } from "@/modules/gateway-quota/lib/credits";
import type { GatewayCreditPool, GatewayCredits } from "@/types/gateway-log";

const BAR_TONE = {
  empty: "bg-destructive",
  low: "bg-amber-500",
  ok: "bg-primary",
} as const;

// One pool's numbers plus its bar. The bar is decoration — the numbers beside
// it carry the same information as text, so colour is never the only signal.
export function CreditsMeter({
  pool,
  className,
}: {
  pool: GatewayCreditPool;
  className?: string;
}) {
  const tone = poolTone(pool);
  const daily = isDaily(pool);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm text-muted-foreground">
          <span className="text-base font-semibold text-foreground">
            {formatNumber(pool.remaining)}
          </span>{" "}
          of {formatNumber(pool.allowance)} credits left
        </p>
        <p className="text-xs text-muted-foreground">{formatNumber(pool.used)} used</p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pool.used}
        aria-valuemin={0}
        aria-valuemax={pool.allowance}
        aria-label={`${pool.platform} gateway credits used`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full transition-all", BAR_TONE[tone])}
          style={{ width: `${usedRatio(pool) * 100}%` }}
        />
      </div>
      {/* The reset is the pool's most load-bearing property once it runs low,
          so it is stated on every daily pool rather than only at zero. */}
      {daily && (
        <p className="text-xs text-muted-foreground">
          Resets daily at midnight
          {pool.resets_at ? ` — next ${formatDate(pool.resets_at)}` : ""}
        </p>
      )}
    </div>
  );
}

// One pool as a labelled row: the partner chip, then its meter. With `href`
// the row is a link (the citizen surfaces send it to the catalog's Usage
// tab); without it it stays a plain card — the admin modals reuse this row
// and must not link into citizen routes.
export function CreditsPoolRow({ pool, href }: { pool: GatewayCreditPool; href?: string }) {
  const tone = poolTone(pool);

  const shell = cn(
    "rounded-lg border px-3.5 py-3",
    tone === "empty" ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/30",
    href &&
      "block transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
  );

  const inner = (
    <>
      <div className="mb-2 flex items-center gap-2">
        <PlatformBadge platform={pool.platform} />
        {tone === "empty" && (
          <span className="text-xs font-medium text-destructive">Exhausted</span>
        )}
        {tone === "low" && (
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Running low</span>
        )}
      </div>
      <CreditsMeter pool={pool} />
    </>
  );

  if (href) {
    return (
      <Link href={href} className={shell}>
        {inner}
      </Link>
    );
  }

  return <div className={shell}>{inner}</div>;
}

// The citizen-facing card. One meter per API catalog: the pools are ISOLATED,
// so running out on one partner leaves the others working — which is why this
// lists them rather than showing a single combined balance.
export function CreditsCard({
  credits,
  className,
}: {
  credits: GatewayCredits;
  className?: string;
}) {

  return (
    <Card className={className}>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Gauge className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">API credits</h2>
            <p className="text-xs text-muted-foreground">
              One credit per API call. Each eGov API has its own allowance —
              running out on one doesn&apos;t affect the others.
            </p>
          </div>
        </div>

        {credits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API allowances yet.</p>
        ) : (
          // Three across on desktop. A single column would run the full width
          // of the page for one short meter each, pushing the usage log the
          // reader came for below the fold.
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {credits.map((pool) => (
              <CreditsPoolRow
                key={pool.platform}
                pool={pool}
                // The full meter and call log behind the number — same
                // landing as a credit alert and the dashboard tiles.
                href={`/dashboard/api-catalogs/${pool.platform}?tab=usage`}
              />
            ))}
          </div>
        )}

        {/* No aggregated alert here: unlike the dashboard's compact tiles,
            every row above already carries its own Exhausted / Running low
            badge, and the credit notifications cover the away-from-the-page
            case — a third restatement was noise. */}
      </CardContent>
    </Card>
  );
}
