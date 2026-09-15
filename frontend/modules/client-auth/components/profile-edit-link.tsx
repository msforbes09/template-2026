import Link from "next/link";
import { Lock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canEditProfile } from "@/modules/client-auth/lib/account";
import type { ClientUserProfile } from "@/types/client-user";

// The way into the editor. A suspended account is frozen read-only, so the
// control says so rather than leading to a form that refuses every save.
//
// The 30-day cooldown deliberately does NOT hide this: details and photo lock
// independently, so one of them may well be editable, and the editor itself
// says which.
export function ProfileEditLink({ profile }: { profile: ClientUserProfile }) {
  if (!canEditProfile(profile)) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5">
        <Lock aria-hidden className="size-3.5" />
        Editing disabled
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      nativeButton={false}
      render={<Link href="/dashboard/profile/edit" />}
    >
      <Pencil aria-hidden className="size-3.5" />
      Edit profile
    </Button>
  );
}
