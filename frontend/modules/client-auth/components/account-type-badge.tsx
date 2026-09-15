import { Code2, Lock, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isDeveloper, isSuspended } from "@/modules/client-auth/lib/account";
import type { ClientUserProfile } from "@/types/client-user";

// The account's TYPE, which is the durable thing about it. Lifecycle state is
// the status panel's job — repeating it here would just say the same thing
// twice in one viewport.
//
// Suspension is the exception: it outranks the type, because a suspended
// developer can do less than a basic account and showing "Developer" would
// overstate what they have.
export function AccountTypeBadge({ profile }: { profile: ClientUserProfile }) {
  if (isSuspended(profile)) {
    return (
      <Badge variant="secondary" className="gap-1.5 bg-destructive/10 text-destructive">
        <Lock aria-hidden className="size-3" />
        Suspended
      </Badge>
    );
  }

  return isDeveloper(profile) ? (
    <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary">
      <Code2 aria-hidden className="size-3" />
      Developer
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1.5">
      <UserRound aria-hidden className="size-3" />
      Basic
    </Badge>
  );
}
