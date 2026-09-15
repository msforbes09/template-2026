import { AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/format-date";
import { formatNumber } from "@/lib/format-number";

// The gateway answers 429 with the domain envelope
// `{ error: "quota_exceeded", message, meta: { platform, allowance, used,
// remaining, resets_at } }` once one of a citizen's per-catalog pools runs
// out. Parsed defensively: this is a live partner response rendered verbatim,
// so it may not be JSON at all, and an older gateway build won't carry the
// per-catalog fields.
type QuotaError = {
  message: string;
  platform?: string;
  allowance?: number;
  used?: number;
  // `Y-m-d H:i:s` when a DAILY pool's used resets; absent/null on a lifetime
  // pool, where only an admin top-up clears it. This is the field that decides
  // what the caller should actually do, so it drives the copy below.
  resetsAt?: string;
};

function parseQuotaError(body: string): QuotaError | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const envelope = parsed as { error?: unknown; message?: unknown; meta?: Record<string, unknown> };
  if (envelope.error !== "quota_exceeded") return null;

  const meta = envelope.meta;
  return {
    message:
      typeof envelope.message === "string"
        ? envelope.message
        : "Your API usage limit has been reached.",
    platform: typeof meta?.platform === "string" ? meta.platform : undefined,
    allowance: typeof meta?.allowance === "number" ? meta.allowance : undefined,
    used: typeof meta?.used === "number" ? meta.used : undefined,
    resetsAt: typeof meta?.resets_at === "string" ? meta.resets_at : undefined,
  };
}

// Shown instead of leaving the raw 429 to speak for itself: retrying won't
// help — the call is rejected before it reaches the partner.
//
// What clears it depends on the pool. A DAILY pool refills at midnight, so the
// answer is to wait; a LIFETIME pool needs an administrator. Getting this wrong
// in either direction wastes the caller's time, so the copy follows
// `resets_at` rather than assuming.
export function QuotaExceededNotice({ statusCode, body }: { statusCode: number; body: string }) {
  if (statusCode !== 429) return null;
  const quota = parseQuotaError(body);
  if (!quota) return null;

  const subject = quota.platform ? `${quota.platform} API credits` : "API credits";

  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
    >
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1">
        <p className="font-medium">You&apos;re out of {subject}</p>
        <p className="text-xs leading-relaxed">
          {quota.message} Retrying won&apos;t help — this call was rejected before it reached the
          API.{" "}
          {quota.resetsAt
            ? `This allowance resets daily at midnight — next ${formatDate(quota.resetsAt)}.`
            : "Contact support to have your allowance topped up."}
          {quota.allowance != null && quota.used != null && (
            <>
              {" "}
              You&apos;ve used {formatNumber(quota.used)} of {formatNumber(quota.allowance)} credits.
            </>
          )}
          {quota.platform && (
            <> Your other eGov APIs are unaffected — each has its own allowance.</>
          )}
        </p>
      </div>
    </div>
  );
}
