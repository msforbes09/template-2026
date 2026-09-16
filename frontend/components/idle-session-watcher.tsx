"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ActionResult } from "@/lib/action-result";
import { idleSchedule } from "@/lib/idle-session";

export type KeepAliveResult = ActionResult<{ session_inactivity_minutes?: number }>;

// The client half of the backend's sliding session: the server expires a
// bearer token `session_inactivity_minutes` after its last request, so this
// counts that same window down from the render that read it, warns one
// warning-length before the end, and either slides the token (one cheap
// authenticated request through `keepAlive`) or signs out cleanly so the
// user is not left staring at a console whose next click 401s.
//
// Mouse and keyboard activity are deliberately NOT treated as a reset: they
// do not reach the server, so they do not move its clock. The window restarts
// only when a request does — a navigation re-renders the mount with a fresh
// value, and "Stay signed in" makes one on purpose.
export function IdleSessionWatcher({
  windowMinutes,
  warningSeconds = 60,
  keepAlive,
  signOut,
  redirectTo,
  navigate = (href) => {
    // A FULL PAGE LOAD, as every sign-out in this app does: cacheComponents
    // keeps hidden routes' state alive across soft navigations.
    window.location.href = href;
  },
}: {
  windowMinutes: number | undefined;
  warningSeconds?: number;
  keepAlive: () => Promise<KeepAliveResult>;
  signOut: () => Promise<void>;
  redirectTo: string;
  navigate?: (href: string) => void;
}) {
  const [minutes, setMinutes] = useState(windowMinutes);
  // A navigation re-renders the mount with a fresh window (the server just
  // slid the token): adopt it during render, the React-sanctioned way to
  // derive state from a changed prop without an effect.
  const [seenWindow, setSeenWindow] = useState(windowMinutes);
  if (seenWindow !== windowMinutes) {
    setSeenWindow(windowMinutes);
    setMinutes(windowMinutes);
  }
  // Bumped to restart the countdown after a keep-alive without changing the
  // window length; the effect below keys on it.
  const [cycle, setCycle] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const leaving = useRef(false);

  const leave = useCallback(async () => {
    if (leaving.current) return;
    leaving.current = true;
    await signOut();
    navigate(redirectTo);
  }, [navigate, redirectTo, signOut]);

  useEffect(() => {
    const schedule = idleSchedule(minutes, warningSeconds);
    if (!schedule) return;

    const startedAt = Date.now();
    let tick: ReturnType<typeof setInterval> | undefined;

    const warn = setTimeout(() => {
      const update = () => {
        const left = Math.max(0, Math.ceil((startedAt + schedule.expireAfterMs - Date.now()) / 1000));
        setRemaining(left);
        if (left === 0) {
          clearInterval(tick);
          void leave();
        }
      };
      update();
      tick = setInterval(update, 1000);
    }, schedule.warnAfterMs);

    return () => {
      clearTimeout(warn);
      clearInterval(tick);
      setRemaining(null);
    };
  }, [minutes, warningSeconds, cycle, leave]);

  async function stay() {
    setBusy(true);
    const result = await keepAlive();
    setBusy(false);
    if (!result.ok) {
      await leave();
      return;
    }
    if (result.data.session_inactivity_minutes) setMinutes(result.data.session_inactivity_minutes);
    setRemaining(null);
    setCycle((n) => n + 1);
  }

  if (remaining === null) return null;

  return (
    <AlertDialog open onOpenChange={() => {}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Still there?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll be signed out in {remaining} {remaining === 1 ? "second" : "seconds"} because
            of inactivity.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            disabled={busy}
            onClick={(event) => {
              event.preventDefault();
              void stay();
            }}
          >
            Stay signed in
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
