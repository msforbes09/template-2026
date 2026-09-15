"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AlertTriangle, CircleCheck, X } from "lucide-react";
import {
  formatMs,
  formatRate,
  healthVerdict,
} from "@/modules/gateway-usage/lib/usage-metrics";
import type { UsageByCatalog } from "@/types/gateway-usage";

// Dismissals live in sessionStorage keyed by WHAT was found, not just "seen":
// the banner stays away across reloads for the same findings, but returns the
// moment the findings change (a new alarm, a rate that moved, a window shift)
// — and on a fresh browser session, which is the closest client-side proxy
// for "a new login". Storage can be blocked; every access is guarded and the
// banner then simply shows.
const STORAGE_KEY = "usage-verdict-dismissed";

// useSyncExternalStore plumbing: re-reads on hydration (server snapshot is
// null, so SSR always renders the banner) and on cross-tab storage events;
// same-tab dismissals go through local state below.
function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function readDismissed(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// The page's headline: which APIs are past the lines the tables below judge
// by, or one quiet sentence when none are. Derived, never fetched — see
// healthVerdict. Each finding chip links to the dashboard filtered to that
// platform (hrefs built by the server caller — functions can't cross the
// boundary), so the alarm IS the road to the narrowed view.
export function HealthVerdictLine({
  byCatalog,
  hrefs,
}: {
  byCatalog: UsageByCatalog[];
  // platform → dashboard-filtered-to-it url, for every platform in byCatalog.
  hrefs: Record<string, string>;
}) {
  const verdict = healthVerdict(byCatalog);
  const fingerprint = [
    ...verdict.partnerAlarms.map((alarm) => `5xx:${alarm.platform}:${alarm.rate}`),
    ...verdict.latencyAlarms.map((alarm) => `p99:${alarm.platform}:${alarm.p99}`),
  ]
    .sort()
    .join("|");

  const stored = useSyncExternalStore(subscribeToStorage, readDismissed, () => null);
  // The just-dismissed FINGERPRINT, not a boolean: a soft navigation can swap
  // the findings without remounting this component, and changed findings must
  // un-dismiss.
  const [justDismissedFp, setJustDismissedFp] = useState<string | null>(null);
  const dismissed = justDismissedFp === fingerprint || stored === fingerprint;

  const quiet = verdict.latencyAlarms.length === 0 && verdict.partnerAlarms.length === 0;

  if (quiet) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">
        <CircleCheck aria-hidden className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        Everything looks normal — no server errors or slow responses in this window.
      </p>
    );
  }

  if (dismissed) return null;

  const dismiss = () => {
    setJustDismissedFp(fingerprint);
    try {
      sessionStorage.setItem(STORAGE_KEY, fingerprint);
    } catch {
      // Storage blocked — the dismissal still holds for this page view.
    }
  };

  // One chip per finding, not a run-on sentence: each problem reads on its
  // own and the row wraps cleanly however many there are.
  //
  // The inline script kills the hydration flash: SSR can't know the
  // dismissal, so without it a dismissed banner rendered visibly until
  // hydration caught up. It runs during HTML parsing — before first paint —
  // hides the banner when the stored fingerprint matches, and React's own
  // state takes over after hydration (suppressHydrationWarning covers the
  // style the script may have set).
  return (
    <div
      role="status"
      suppressHydrationWarning
      className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3"
    >
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem(${JSON.stringify(STORAGE_KEY)})===${JSON.stringify(fingerprint)})document.currentScript.parentElement.style.display="none"}catch(e){}`,
        }}
      />
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-destructive">Gateway needs attention</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {verdict.partnerAlarms.map((partner) => (
            <Link
              key={`5xx-${partner.platform}`}
              href={hrefs[partner.platform] ?? "#"}
              className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {partner.platform}&ensp;·&ensp;{formatRate(partner.rate, 1)} server errors
            </Link>
          ))}
          {verdict.latencyAlarms.map((alarm) => (
            <Link
              key={`p99-${alarm.platform}`}
              href={hrefs[alarm.platform] ?? "#"}
              className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {alarm.platform}&ensp;·&ensp;P99 {formatMs(alarm.p99)}
            </Link>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss until the findings change"
        className="shrink-0 rounded-md p-1 text-destructive/60 transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
