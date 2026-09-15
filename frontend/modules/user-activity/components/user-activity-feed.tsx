"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Radio } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { consoleCardClassName } from "@/modules/admin/lib/console-card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-date";
import { getEcho } from "@/lib/echo-client";
import { describeActivity } from "@/modules/user-activity/lib/describe-activity";
import type { UserActivityEvent } from "@/types/user-activity";

// Shared, system-wide activity feed: every administrator viewing the
// dashboard sees the same stream. The events carry no admin-identifying
// field, so it cannot be scoped to one viewer client-side.
//
// This component owns the shared channel's lifecycle (private() + leave()).
// UserActivityStats (modules/user-activity/components/user-activity-stats.tsx) also
// listens on this same channel for a different event, but only adds/removes
// its own listener — Echo dedupes repeated private() calls to the same
// channel (returns the existing instance), but leave() tears down the whole
// channel, so only one consumer should ever call it.
const CHANNEL = "administrators"; // Echo.private() prepends "private-" itself
const EVENTS = [".user.authenticated", ".user.activated"] as const;
// Rendered items past this are dropped from state entirely (not just
// visually scrolled past) so the DOM never grows past MAX_ITEMS nodes —
// the same cap also bounds the pending queue below.
const MAX_ITEMS = 20;
// A burst of events arriving within the same tick would otherwise all land
// in the same setItems call and animate in on the same frame — reading as
// one batch even with a per-item enter animation. Incoming events instead
// queue here and get revealed to the list one at a time on this cadence.
const REVEAL_INTERVAL_MS = 1_000;
// Each slot lands as a skeleton first, then morphs into the real content
// after this delay — a placeholder-first reveal rather than the real data
// popping straight in.
const SKELETON_REVEAL_DELAY_MS = 450;

type FeedItem = UserActivityEvent & { revealed: boolean };

// Connection status is an external system's current value — the textbook
// case for useSyncExternalStore rather than setState-in-effect (which the
// React Compiler's eslint rule correctly flags as a cascading-render risk).
function subscribeConnectionStatus(callback: () => void) {
  return getEcho("admin").connector.onConnectionChange(callback);
}
function getConnectionStatusSnapshot() {
  return getEcho("admin").connectionStatus();
}
function getConnectionStatusServerSnapshot() {
  // getEcho("admin") must never run server-side; SSR always starts "connecting".
  return "connecting" as const;
}

export function UserActivityFeed({ fillHeight = false }: { fillHeight?: boolean } = {}) {
  // The caller (the dashboard, in a fixed-height row beside the chart) asks
  // for fill-available-height so the card keeps a stable height instead of
  // resizing as its item count and empty state change. This used to also be
  // driven by a fullscreen context, which went with the activation kiosk.
  const shouldFillHeight = fillHeight;
  const status = useSyncExternalStore(
    subscribeConnectionStatus,
    getConnectionStatusSnapshot,
    getConnectionStatusServerSnapshot,
  );
  const [items, setItems] = useState<FeedItem[]>([]);
  const reduceMotion = useReducedMotion();
  // Pending reveals — mutated directly (not state) since queueing an
  // arrival shouldn't itself trigger a render; only the drain timer below
  // ever calls setItems.
  const queueRef = useRef<UserActivityEvent[]>([]);

  useEffect(() => {
    const echo = getEcho("admin");
    const channel = echo.private(CHANNEL);

    const bound = EVENTS.map((event) => {
      const handler = (payload: UserActivityEvent["payload"]) => {
        const notification: UserActivityEvent = {
          id: crypto.randomUUID(),
          event,
          payload,
          receivedAt: new Date().toISOString(),
        };
        queueRef.current.push(notification);
        if (queueRef.current.length > MAX_ITEMS) queueRef.current.shift();
      };
      channel.listen(event, handler);
      return { event, handler };
    });

    return () => {
      bound.forEach(({ event, handler }) => channel.stopListening(event, handler));
      echo.leave(CHANNEL);
    };
  }, []);

  // Drains the queue one notification at a time on a steady cadence, so a
  // burst of near-simultaneous events reveals as a visible one-by-one
  // sequence in the list instead of all landing in a single render. Each
  // slot lands as a skeleton and flips to `revealed` a beat later — skipped
  // under reduced motion, where the real content lands immediately.
  useEffect(() => {
    const revealTimeouts = new Set<ReturnType<typeof setTimeout>>();

    const id = setInterval(() => {
      const next = queueRef.current.shift();
      if (!next) return;

      if (reduceMotion) {
        setItems((prev) => [{ ...next, revealed: true }, ...prev].slice(0, MAX_ITEMS));
        return;
      }

      setItems((prev) => [{ ...next, revealed: false }, ...prev].slice(0, MAX_ITEMS));
      const revealId = setTimeout(() => {
        revealTimeouts.delete(revealId);
        setItems((prev) =>
          prev.map((item) => (item.id === next.id ? { ...item, revealed: true } : item)),
        );
      }, SKELETON_REVEAL_DELAY_MS);
      revealTimeouts.add(revealId);
    }, REVEAL_INTERVAL_MS);

    return () => {
      clearInterval(id);
      revealTimeouts.forEach(clearTimeout);
    };
  }, [reduceMotion]);

  return (
    <Card className={cn(consoleCardClassName, shouldFillHeight && "h-full min-h-0")}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Radio aria-hidden className="size-4" />
          Activity
        </CardTitle>
        <StatusBadge
          active={status === "connected"}
          activeLabel="Live"
          inactiveLabel={status === "connecting" ? "Connecting…" : "Disconnected"}
        />
      </CardHeader>
      <CardContent className={cn(shouldFillHeight && "flex min-h-0 flex-1 flex-col")}>
        {items.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No activity yet"
            description="Sign-ins and approvals will appear here as they happen."
          />
        ) : (
          <ul
            aria-live="polite"
            className={cn(
              "space-y-2 overflow-y-auto",
              shouldFillHeight ? "h-full" : "max-h-120",
            )}
          >
            {/* Each event renders — and animates in — as its own list item as
                it arrives, one at a time, sliding in left-to-right; `layout`
                shifts the existing items down smoothly to make room, like a
                stack gaining a new card on top rather than the list just
                repainting. It lands as a skeleton and crossfades into the
                real content a beat later. */}
            <AnimatePresence initial={false}>
              {items.map((n) => (
                <motion.li
                  key={n.id}
                  layout={reduceMotion ? false : "position"}
                  initial={reduceMotion ? false : { opacity: 0, x: -24, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, x: 16, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  {/* popLayout: the exiting skeleton is pulled out of flow
                      the instant the swap starts, so it doesn't share flex
                      width with the entering content and squish it. */}
                  <AnimatePresence mode="popLayout">
                    {n.revealed ? (
                      <motion.div
                        key="content"
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <Avatar>
                          <AvatarImage src={n.payload.photo_url} alt="" />
                          <AvatarFallback aria-hidden>{n.payload.user.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{describeActivity(n).title}</p>
                          <p className="truncate text-muted-foreground">{n.payload.user}</p>
                        </div>
                        <p className="shrink-0 text-xs text-muted-foreground">
                          {formatDate(n.receivedAt, "h:mm:ss a")}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="skeleton"
                        aria-hidden
                        initial={false}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="h-3.5 w-2/5 animate-pulse rounded bg-muted" />
                          <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
                        </div>
                        <div className="h-3 w-12 shrink-0 animate-pulse rounded bg-muted" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
