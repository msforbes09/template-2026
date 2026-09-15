"use client";

import { useEffect, useState } from "react";
import { isBroadcastStuck } from "@/modules/broadcasts/lib/broadcast-audience";
import { BROADCAST_STUCK_AFTER_MS } from "@/types/broadcast";

// "Still sending" — shown once a fan-out has been running far longer than it
// should.
//
// A client leaf rather than a server-side check, for two reasons. Reading the
// clock during a Server Component's render is an impure call the React
// Compiler rejects outright; and the judgement is genuinely time-dependent, so
// computing it once on the server would freeze it — a row that becomes stuck
// while the admin is looking at the page would never say so until they
// reloaded. Here it appears on its own.
//
// Deliberately not an error state. The broadcast is fine and needs no
// re-sending; it is the queue that wants looking at.
export function SendingHint({ startedAt }: { startedAt: string | null }) {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (!startedAt) return;

    const check = () =>
      setStuck(isBroadcastStuck(startedAt, "sending", Date.now(), BROADCAST_STUCK_AFTER_MS));

    check();
    // Once a minute is plenty for a five-minute threshold, and cheap enough
    // to leave running on a page an admin may keep open.
    const timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, [startedAt]);

  if (!stuck) return null;

  return (
    <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
      Still sending. A fan-out this old usually means the queue is backed up or the
      job failed — worth asking ops to check it. The broadcast itself is fine and
      does not need re-sending.
    </p>
  );
}
