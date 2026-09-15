"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { completeProfile } from "@/modules/client-auth/actions/profile-actions";
import { humanize } from "@/lib/humanize";

// Marking the profile complete unlocks reviewing — and starts both 30-day
// edit cooldowns, which is worth saying before they press it rather than
// after they discover the lock.
export function CompleteProfileButton() {
  const router = useRouter();
  const [missing, setMissing] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setMissing([]);
    startTransition(async () => {
      const result = await completeProfile();
      if (result.ok) {
        // Back to the dashboard, where the journey stepper now shows step 1
        // done and applying as a developer as the live step.
        //
        // push() ALONE — no refresh() alongside it. This runs inside the
        // transition that drives the button's spinner, and refresh() would
        // re-render the route we are leaving, which server-side redirects
        // here the moment the status stops being `draft`. The two router
        // operations never settle, so the transition (and the spinner) hung
        // forever. A dynamic segment is refetched on navigation anyway, so
        // the dashboard still renders the new status.
        router.push("/dashboard");
        toast.success("Profile completed — you can now rate and review projects");
        return;
      }
      // The API names the empty fields, which is far more useful than a
      // generic "incomplete" and saves hunting through the form.
      if (result.code === "profile_incomplete") {
        const named = result.meta?.missing;
        setMissing(Array.isArray(named) ? named.filter((f): f is string => typeof f === "string") : []);
        toast.error("Some required details are still missing");
        return;
      }
      toast.error(result.message);
    });
  }

  return (
    <div className="space-y-2">
      {/* h-10 w-full to match the edit form's Save changes button — the two
          are consecutive steps of the same funnel. */}
      <Button disabled={isPending} onClick={submit} className="h-10 w-full gap-1.5">
        {isPending ? (
          <Loader2 aria-hidden className="size-3.5 animate-spin" />
        ) : (
          <CircleCheck aria-hidden className="size-3.5" />
        )}
        Complete profile
      </Button>
      {missing.length > 0 && (
        <div role="alert" className="rounded-lg border border-destructive/20 bg-background/60 p-3">
          <p className="text-xs font-medium text-destructive">Still needed</p>
          <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
            {missing.map((field) => (
              <li key={field}>{humanize(field)}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">
        Once complete, your details and photo each lock for 30 days between changes.
      </p>
    </div>
  );
}
