"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format-date";
import { waivePasswordExpiry } from "@/modules/admin/actions/password-expiry";

// The soft state of password expiry: expired, but with postponements left, so
// the console stays open and this asks rather than blocks. Once the last
// postponement is used the gate (ForcePasswordChangeGate) takes over.
export function PasswordExpiryNotice({
  expiresAt,
  waivesRemaining,
}: {
  expiresAt: string;
  waivesRemaining: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function remindLater() {
    startTransition(async () => {
      const result = await waivePasswordExpiry();
      if (result.ok) {
        toast.success("Password expiry postponed. You'll be reminded again when it runs out.");
        router.refresh();
        return;
      }
      toast.error(result.message);
    });
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl border border-highlight/40 bg-highlight/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-highlight" />
        <p>
          <span className="font-medium">Your password expired on {formatDate(expiresAt, "dd MMM yyyy")}.</span>{" "}
          Change it now, or postpone the reminder ({waivesRemaining}{" "}
          {waivesRemaining === 1 ? "postponement" : "postponements"} left).
        </p>
      </div>
      <div className="flex shrink-0 gap-2 sm:justify-end">
        <Button variant="outline" size="sm" disabled={isPending} onClick={remindLater}>
          {isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
          Remind me later
        </Button>
        <Button size="sm" nativeButton={false} render={<Link href="/admin/settings" />}>
          Change password
        </Button>
      </div>
    </div>
  );
}
