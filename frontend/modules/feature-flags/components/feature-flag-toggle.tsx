"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { setFeatureFlag } from "@/modules/feature-flags/actions/feature-flag-actions";
import { confirmPhrase, phraseMatches } from "@/modules/feature-flags/lib/confirm-phrase";

// One flag's switch. Flipping it does NOT apply the change — it opens a
// confirmation that requires typing the action ("enable maintenance mode"),
// StartBroadcastButton's all-users treatment: these switches change the live
// portal the moment they land, and a plain "Are you sure?" is a button people
// learn to click without reading. The switch itself only moves once the
// server accepts — with the dialog in between there is no optimistic flip to
// roll back.
export function FeatureFlagToggle({
  name,
  label,
  enabled,
  destructive,
}: {
  name: string;
  label: string;
  enabled: boolean;
  // maintenance_mode inverts the usual meaning — ON takes the site down — so
  // switching it on gets the destructive styling and wording.
  destructive?: boolean;
}) {
  const router = useRouter();
  const inputId = useId();
  const [on, setOn] = useState(enabled);
  // The direction being confirmed; null = dialog closed. Set by the switch,
  // cleared on cancel — the switch never shows a state the server hasn't
  // accepted.
  const [pendingNext, setPendingNext] = useState<boolean | null>(null);
  const [typed, setTyped] = useState("");
  const [isPending, startTransition] = useTransition();

  const next = pendingNext ?? !on;
  const phrase = confirmPhrase(label, next);
  const confirmed = phraseMatches(typed, phrase);
  const dangerous = Boolean(destructive) && next;

  function close() {
    setPendingNext(null);
    // Reset rather than leaving a typed phrase behind — reopening should
    // demand it again.
    setTyped("");
  }

  function apply() {
    startTransition(async () => {
      const result = await setFeatureFlag(name, next);
      if (result.ok) {
        setOn(next);
        close();
        // The action already dropped the flag cache; this refreshes the row's
        // own server-rendered state so the screen agrees with it.
        router.refresh();
        toast.success(
          dangerous
            ? `${label} is ON — the portal is now showing the maintenance page`
            : `${label} is now ${next ? "on" : "off"}`,
        );
        return;
      }
      toast.error(
        result.code === "insufficient_permissions"
          ? "Only developer administrators can change system controls."
          : result.message,
      );
    });
  }

  return (
    <>
      <Switch
        checked={on}
        disabled={isPending}
        onCheckedChange={(value) => setPendingNext(value)}
        aria-label={`${label} — currently ${on ? "on" : "off"}`}
      />

      <Dialog open={pendingNext !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {next ? "Enable" : "Disable"} {label.toLowerCase()}?
            </DialogTitle>
            <DialogDescription>
              {dangerous
                ? "This takes the user portal and public site down behind the maintenance page the moment you confirm."
                : "This changes the live portal immediately — there is no deploy and no restart."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div
              className={
                "flex flex-col gap-2 rounded-lg border p-3 " +
                (dangerous
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-border bg-muted/40")
              }
            >
              <p className="flex items-start gap-2 text-sm">
                {dangerous && (
                  <TriangleAlert
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-destructive"
                  />
                )}
                <span>
                  Type{" "}
                  <code className="rounded bg-muted px-1 font-mono text-xs">{phrase}</code> to
                  confirm.
                </span>
              </p>
              <Label htmlFor={inputId} className="sr-only">
                Type {phrase} to confirm
              </Label>
              <Input
                id={inputId}
                value={typed}
                autoComplete="off"
                placeholder={phrase}
                onChange={(event) => setTyped(event.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={close} disabled={isPending}>
                Cancel
              </Button>
              <Button
                variant={dangerous ? "destructive" : "default"}
                onClick={apply}
                disabled={!confirmed || isPending}
              >
                {isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
                {next ? "Enable" : "Disable"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
