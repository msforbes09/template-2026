import { CircleCheck, Send } from "lucide-react";
import { accountStatus } from "@/modules/client-auth/lib/account";
import { accountStatusCopy } from "@/modules/client-auth/lib/account-status";
import { CompleteProfileButton } from "@/modules/client-auth/components/complete-profile-button";
import { cn } from "@/lib/utils";
import type { ClientUserProfile } from "@/types/client-user";

// What the user sees about their own account, driven entirely by status.
// Each state gets the one action that belongs to it and nothing else, so the
// dashboard never offers a control the API would refuse.
const TONE_CLASS = {
  neutral: "border-border bg-card",
  progress: "border-amber-500/20 bg-amber-500/5",
  action: "border-primary/20 bg-primary/5",
  good: "border-emerald-500/20 bg-emerald-500/5",
  frozen: "border-destructive/20 bg-destructive/5",
} as const;

export function AccountStatePanel({ profile }: { profile: ClientUserProfile }) {
  const status = accountStatus(profile.status);
  const copy = accountStatusCopy(profile);
  if (!status || !copy) return null;

  const Icon = status === "draft" ? Send : CircleCheck;

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
          {/* The one action a draft has: marking the profile complete. Fill
              the details first via the edit page; the API names any field
              still missing. */}
          {status === "draft" && (
            <div className="max-w-xs pt-2">
              <CompleteProfileButton />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
