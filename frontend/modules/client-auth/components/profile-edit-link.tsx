import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

// The way into the editor.
//
// The 30-day cooldown deliberately does NOT hide this: details and photo lock
// independently, so one of them may well be editable, and the editor itself
// says which.
export function ProfileEditLink() {
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
