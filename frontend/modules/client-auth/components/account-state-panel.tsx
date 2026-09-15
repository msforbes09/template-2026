import { CircleCheck, FileClock, Lock, PauseCircle, Send } from "lucide-react";
import { accountStatus } from "@/modules/client-auth/lib/account";
import { accountStatusCopy, suspensionReason } from "@/modules/client-auth/lib/account-status";
import { cn } from "@/lib/utils";
import type { ClientUserProfile } from "@/types/client-user";

// What the citizen sees about their own account, driven entirely by status.
// Each state gets the one action that belongs to it and nothing else, so the
// dashboard never offers a control the API would refuse.
const TONE_CLASS = {
  neutral: "border-border bg-card",
  progress: "border-amber-500/20 bg-amber-500/5",
  action: "border-primary/20 bg-primary/5",
  good: "border-emerald-500/20 bg-emerald-500/5",
  frozen: "border-destructive/20 bg-destructive/5",
} as const;

const TONE_ICON = {
  neutral: PauseCircle,
  progress: FileClock,
  action: Send,
  good: CircleCheck,
  frozen: Lock,
} as const;

export function AccountStatePanel({ profile }: { profile: ClientUserProfile }) {
  const status = accountStatus(profile.status);
  const copy = accountStatusCopy(profile);
  if (!status || !copy) return null;

  const Icon = TONE_ICON[copy.tone];
  // The suspension reason has no field of its own — it is the newest
  // "[Suspended …]" line of the remarks history.
  const suspension = status === "suspended" ? suspensionReason(profile.assessment_remarks) : null;

  return (
    <section
      aria-labelledby="account-state"
      className={cn("rounded-xl border p-6", TONE_CLASS[copy.tone])}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background/70"
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <h2 id="account-state" className="text-base font-semibold tracking-tight">
            {copy.label}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{copy.summary}</p>
          {copy.nextStep && <p className="text-sm leading-relaxed">{copy.nextStep}</p>}

          {suspension && (
            <div className="rounded-lg border border-destructive/20 bg-background/60 p-3">
              <p className="text-xs font-medium text-destructive">
                Reason{suspension.date ? ` · ${suspension.date}` : ""}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{suspension.body}</p>
            </div>
          )}

          {/* No pre-approval branches (draft, completed, for_assessment,
              for_resubmission): those states get AccountJourney on the
              dashboard instead of this panel — it now serves only approved,
              suspended and pending, none of which carry an action. */}
        </div>
      </div>
    </section>
  );
}
