import { CalendarClock } from "lucide-react";
import { formatDate } from "@/lib/format-date";
import type { Cooldown } from "@/modules/client-auth/lib/account";

// Says when a locked field opens again. The API returns the timestamp and the
// window opens at the START of that day, so only the date is shown — printing
// a time would imply a precision the rule does not have.
//
// It is the ONE place the lock is explained on the edit page: it renders only
// while locked (null otherwise), so neither card needs its own "locked" line
// and the page heading doesn't need to pre-announce the rule.
export function CooldownNotice({ cooldown, what }: { cooldown: Cooldown; what: string }) {
  if (!cooldown.locked || !cooldown.until) return null;

  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
    >
      <CalendarClock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>
        Your {what} can be changed again on{" "}
        <span className="font-medium text-foreground">
          {formatDate(cooldown.until, "dd MMM yyyy")}
        </span>
        .
      </span>
    </p>
  );
}
