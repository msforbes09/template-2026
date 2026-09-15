"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, TriangleAlert } from "lucide-react";
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
import { startBroadcast } from "@/modules/broadcasts/actions/broadcast-actions";
import { describeAudience } from "@/modules/broadcasts/lib/broadcast-audience";
import type { AdminBroadcast } from "@/types/broadcast";

// Starting delivery — the irreversible one.
//
// There is no recall and no cancel-while-sending, so the confirmation states
// the audience IN WORDS rather than showing the filters, and the all-users
// case additionally requires the phrase to be typed. An all-users blast is
// the single most expensive mis-click on this screen, and a plain "Are you
// sure?" is a button people learn to click without reading.

const CONFIRM_PHRASE = "send to all";

export function StartBroadcastButton({ broadcast }: { broadcast: AdminBroadcast }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [isPending, startTransition] = useTransition();

  const audience = describeAudience(broadcast.filters);
  const needsPhrase = audience.isEveryone;
  const confirmed = !needsPhrase || typed.trim().toLowerCase() === CONFIRM_PHRASE;

  function handleStart() {
    startTransition(async () => {
      const result = await startBroadcast(broadcast.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Broadcast started", {
        description: "Delivery is queued. The count appears once it finishes.",
      });
      setOpen(false);
      setTyped("");
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Send data-icon="inline-start" />
        Start
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          // Reset rather than leaving a typed phrase behind — reopening
          // should demand it again.
          if (!next) setTyped("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start this broadcast?</DialogTitle>
            <DialogDescription>
              This will notify <strong>{audience.label}</strong>
              {/* The uuid behind a single-citizen scope, at the moment it
                  matters most — right before the send. */}
              {audience.detail && (
                <>
                  {" "}
                  (<span className="font-mono text-xs">{audience.detail}</span>)
                </>
              )}
              . It cannot be recalled or edited once started.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-sm font-semibold">{broadcast.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {broadcast.body}
              </p>
            </div>

            {needsPhrase && (
              <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="flex items-start gap-2 text-sm">
                  <TriangleAlert
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-destructive"
                  />
                  <span>
                    This reaches <strong>every registered user</strong>. Type{" "}
                    <code className="rounded bg-muted px-1 font-mono text-xs">
                      {CONFIRM_PHRASE}
                    </code>{" "}
                    to confirm.
                  </span>
                </p>
                <Label htmlFor="confirm-phrase" className="sr-only">
                  Type {CONFIRM_PHRASE} to confirm
                </Label>
                <Input
                  id="confirm-phrase"
                  value={typed}
                  autoComplete="off"
                  placeholder={CONFIRM_PHRASE}
                  onChange={(event) => setTyped(event.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={handleStart} disabled={!confirmed || isPending}>
                {isPending && <Loader2 data-icon="inline-start" className="animate-spin" />}
                Start delivery
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
