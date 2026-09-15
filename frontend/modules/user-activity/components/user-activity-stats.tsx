"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { consoleCardClassName } from "@/modules/admin/lib/console-card";
import { formatNumber } from "@/lib/format-number";
import { getEcho } from "@/lib/echo-client";
import type { UserActivityTotals } from "@/types/user-activity";

// Same private-administrators channel as UserActivityFeed, but
// this component only adds/removes its own listener for the rolling-totals
// event — it never calls echo.leave(), since that tears down the whole
// channel and UserActivityFeed already owns that lifecycle (see
// the comment there).
const CHANNEL = "administrators";
const STATS_EVENT = ".user.activities";

// How long a "+N" delta badge stays fully visible before it starts fading
// — roughly the count-up duration plus a brief linger, so it reads as
// "this is what just got added" before dissolving into the settled total.
const DELTA_HOLD_MS = 900;

type DeltaBadge = { id: number; delta: number };

// Counts up (or down) to each new total instead of snapping straight to
// it, like a live tally rolling over, and briefly shows the "+N" that just
// arrived beside it before fading it into the total — the first real value
// just appears as-is, since there's nothing to animate from or add yet.
function AnimatedTotal({ value }: { value: number }) {
  const motionValue = useMotionValue(value);
  const display = useTransform(motionValue, (latest) => formatNumber(Math.round(latest)));
  const reduceMotion = useReducedMotion();
  const hasValueRef = useRef(false);
  const previousValueRef = useRef(value);
  const nextBadgeIdRef = useRef(0);
  // Pending badge-removal timers, tracked independently of the count-up
  // effect below — if a second value change arrives before the first
  // badge's timeout fires, that effect re-runs and its OWN cleanup must
  // not cancel a different badge's timer, or that older badge would never
  // get removed. Only cleared wholesale on unmount.
  const timeoutIdsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const [badges, setBadges] = useState<DeltaBadge[]>([]);

  useEffect(() => {
    const timeoutIds = timeoutIdsRef.current;
    return () => {
      timeoutIds.forEach(clearTimeout);
      timeoutIds.clear();
    };
  }, []);

  useEffect(() => {
    if (!hasValueRef.current) {
      motionValue.set(value);
      hasValueRef.current = true;
      previousValueRef.current = value;
      return;
    }

    const delta = value - previousValueRef.current;
    previousValueRef.current = value;

    if (reduceMotion) {
      motionValue.set(value);
      return;
    }

    const controls = animate(motionValue, value, { duration: 0.6, ease: "easeOut" });

    if (delta !== 0) {
      const id = nextBadgeIdRef.current++;
      setBadges((prev) => [...prev, { id, delta }]);
      const timeoutId = setTimeout(() => {
        timeoutIdsRef.current.delete(timeoutId);
        setBadges((prev) => prev.filter((badge) => badge.id !== id));
      }, DELTA_HOLD_MS);
      timeoutIdsRef.current.add(timeoutId);
    }

    return () => controls.stop();
  }, [value, motionValue, reduceMotion]);

  return (
    <span className="relative inline-flex">
      <motion.span>{display}</motion.span>
      <AnimatePresence>
        {badges.map((badge) => (
          <motion.span
            key={badge.id}
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: -2, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute -top-1 left-full ml-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
          >
            {badge.delta > 0 ? `+${formatNumber(badge.delta)}` : formatNumber(badge.delta)}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}

function StatCard({
  label,
  total,
  caption,
  captionClassName,
}: {
  label: string;
  total: number | undefined;
  caption: React.ReactNode;
  captionClassName?: string;
}) {
  return (
    <Card className={consoleCardClassName}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight">
          {total === undefined ? formatNumber(undefined) : <AnimatedTotal value={total} />}
        </p>
        <p className={cn("mt-1 text-xs font-semibold text-muted-foreground", captionClassName)}>
          {caption}
        </p>
      </CardContent>
    </Card>
  );
}

export function UserActivityStats() {
  const [stats, setStats] = useState<UserActivityTotals | null>(null);

  useEffect(() => {
    const channel = getEcho("admin").private(CHANNEL);
    const handler = (payload: UserActivityTotals) => setStats(payload);
    channel.listen(STATS_EVENT, handler);
    return () => {
      channel.stopListening(STATS_EVENT, handler);
    };
  }, []);

  const authenticated = stats?.authenticated.total;
  const activated = stats?.activated.total;
  const apiAccess = stats?.api_access.total;

  // All three counters the backend broadcasts, labelled for what they now
  // count. There used to be an "X% of authenticated" figure under the second
  // card, which no longer means anything: `activated` moved from SSO account
  // activations to administrators approving developer applications, so it and
  // the sign-in count are unrelated populations and the ratio between them
  // would be a number with no referent.
  //
  // The captions say "today" because the backend resets these totals daily
  // (`user-stats:reset`). Without that, a figure that silently returns to
  // zero at midnight reads as a lifetime total that just lost its history.
  const waiting = "Waiting for data…";

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        label="Sign-ins"
        total={authenticated}
        caption={authenticated === undefined ? waiting : "2FA sign-ins today"}
      />
      <StatCard
        label="Approvals"
        total={activated}
        caption={activated === undefined ? waiting : "Applications approved today"}
      />
      <StatCard
        label="API requests"
        total={apiAccess}
        caption={apiAccess === undefined ? waiting : "Gateway requests today"}
      />
    </div>
  );
}
