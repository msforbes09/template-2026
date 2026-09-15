"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ConnectionStatus } from "laravel-echo";
import { getEcho, type EchoAudience } from "@/lib/echo-client";
import type { GatewayLogEvent } from "@/types/gateway-log";

// A rolling per-second call rate, built entirely from the `gateway.log`
// broadcast. Sibling to useGatewayLogFeed rather than a reuse of it: that hook
// is a live TAIL over a REST list and calls router.refresh() on reconnect to
// fill the gap it missed. This one has no list behind it — nothing to refetch,
// and refreshing the page under a live chart would be actively wrong.
//
// STARTS EMPTY BY DESIGN. There is no backfill call: the window is what has
// arrived since the chart mounted, so a quiet minute is a flat line rather
// than a blank panel. The historical chart above it already answers "what
// happened"; this one only answers "what is happening".

// Echo's custom-name binding needs the leading dot, or it namespaces the event
// and never matches what the backend broadcasts.
const EVENT = ".gateway.log";

// How much of the recent past the trace shows, one bin per second.
export const LIVE_WINDOW_SECONDS = 60;

export type LiveRateBin = {
  // The bin's absolute wall-clock second (epoch seconds). Bins are anchored to
  // absolute time, NOT to a fixed offset from "now" — that is what makes the
  // trace scroll: a bin keeps its identity while the window slides over it.
  second: number;
  // Seconds relative to now: −60 at the left edge, 0 at the live tip, and
  // FRACTIONAL. The sub-second remainder is what actually moves the trace —
  // every redraw each point sits a fraction further left than it did.
  //
  // This used to drag the axis labels with it, because data extending past the
  // domain makes recharts refit the scale. That is fixed at the axis now
  // (allowDataOverflow + explicit ticks), not by rounding the data: the scale
  // is pinned, so the points may slide freely inside it.
  offset: number;
  calls: number;
  errors: number;
};

export type LiveUsageRate = {
  bins: LiveRateBin[];
  // Everything seen since mount, for a "N calls since you opened this" readout.
  total: number;
  // Errors among them.
  errorTotal: number;
  status: ConnectionStatus;
};

// How often the window is redrawn. Faster than one second on purpose: the
// motion comes from redrawing with a fresh `now`, so at 1Hz the trace would
// only move once a second. 250ms slides it in quarter-bin steps.
//
// Recharts' own interpolation was tried in place of this and reverted — it
// restarts the animation on every data change rather than chaining, so the
// glide it produced was worse than stepping, not better.
export const LIVE_TICK_MS = 250;

// A flat window anchored to `now`. Bins run OLDEST-FIRST, so the newest second
// is the last entry — left to right on the chart.
function emptyBins(now: number): LiveRateBin[] {
  const nowSeconds = Math.floor(now / 1000);
  return Array.from({ length: LIVE_WINDOW_SECONDS + 1 }, (_, index) => {
    const second = nowSeconds - (LIVE_WINDOW_SECONDS - index);
    return {
      second,
      // Fractional — the remainder is what slides the trace between redraws.
      offset: second - now / 1000,
      calls: 0,
      errors: 0,
    };
  });
}

// The initial, pre-mount window. Deterministic — no Date.now() — so the server
// render and the first client render agree and there is no hydration mismatch.
// Absolute seconds are irrelevant before any data exists, so they are zeroed.
function initialBins(): LiveRateBin[] {
  return Array.from({ length: LIVE_WINDOW_SECONDS + 1 }, (_, index) => ({
    second: 0,
    offset: index - LIVE_WINDOW_SECONDS,
    calls: 0,
    errors: 0,
  }));
}

// getEcho() must never run server-side; SSR always starts "connecting".
function serverStatusSnapshot(): ConnectionStatus {
  return "connecting";
}

// A missing or unparseable status counts as an error, matching how the API
// derives `errors` for the historical chart (calls minus 2xx/3xx) — so the
// live trace and the history classify the same call the same way.
export function isErrorStatus(statusCode: unknown): boolean {
  // Absent FIRST, and not via Number(): Number(null) and Number("") are both
  // 0, which is finite and below 400 — so a null status would have been
  // classified as SUCCESSFUL, quietly under-counting errors and putting this
  // trace at odds with the historical chart it sits under.
  if (statusCode === null || statusCode === undefined || statusCode === "") return true;
  const code = Number(statusCode);
  return !Number.isFinite(code) || code >= 400;
}

function isError(log: GatewayLogEvent): boolean {
  return isErrorStatus(log.status_code);
}

// Whether an incoming event belongs on THIS view.
//
// The same filtering the dashboard's own query applies, so the trace and the
// numbers above it never describe different slices. It matters most on the
// admin side: there is one shared `administrators` channel carrying every
// developer's calls, so a drilled-in page would otherwise plot the whole
// platform's traffic under one person's name. An absent filter means "all",
// never "none".
export function matchesScope(
  log: Pick<GatewayLogEvent, "platform" | "user_uuid">,
  platform?: string,
  userUuid?: string | null,
): boolean {
  if (platform && log.platform !== platform) return false;
  if (userUuid && log.user_uuid !== userUuid) return false;
  return true;
}

// The whole window, derived from raw arrivals. Exported and pure because the
// bin index is the one place an off-by-one would ship silently: the array runs
// OLDEST-first while `secondsAgo` counts backwards, so the newest second is
// the LAST entry and the arithmetic inverts.
export function buildBins(
  arrivals: readonly { at: number; error: boolean }[],
  now: number,
): LiveRateBin[] {
  const bins = emptyBins(now);
  const oldest = bins[0].second;
  for (const arrival of arrivals) {
    // Bucketed by the arrival's OWN absolute second, so a call stays in the
    // same bin as the window slides past it rather than being re-bucketed
    // relative to a moving "now".
    const second = Math.floor(arrival.at / 1000);
    const index = second - oldest;
    if (index < 0 || index >= bins.length) continue;
    bins[index].calls += 1;
    if (arrival.error) bins[index].errors += 1;
  }
  return bins;
}

export function useLiveUsageRate({
  audience,
  channel,
  platform = "",
  userUuid,
  enabled,
}: {
  audience: EchoAudience;
  // `user.${uuid}` for a citizen, "administrators" for the shared admin feed.
  // Echo.private() prepends "private-" itself.
  channel: string;
  // Kept in step with the dashboard's own platform filter, so the live trace
  // and the numbers above it describe the same slice.
  platform?: string;
  // Admin per-developer scope. There is ONE admin channel by design and it
  // carries every developer's calls, so the drill is this filter — without it
  // a drilled-in view would plot the whole platform's traffic under one
  // person's name.
  userUuid?: string | null;
  enabled: boolean;
}): LiveUsageRate {
  const [bins, setBins] = useState<LiveRateBin[]>(initialBins);
  const [total, setTotal] = useState(0);
  const [errorTotal, setErrorTotal] = useState(0);

  // Arrival timestamps, not state: recording an arrival must not itself
  // render. The interval below derives the whole window from this once a
  // second, which is also what makes the trace fall back to zero when the
  // feed goes quiet rather than freezing at its last value.
  const arrivalsRef = useRef<{ at: number; error: boolean }[]>([]);

  // Connection status is an external system's current value — the
  // useSyncExternalStore case, not setState-in-effect. Both callbacks no-op
  // while disabled, because getEcho() OPENS the socket: reading the status
  // eagerly would connect for a citizen with no uuid, who never subscribes.
  const subscribeStatus = useCallback(
    (onChange: () => void) => {
      if (!enabled) return () => {};
      return getEcho(audience).connector.onConnectionChange(onChange);
    },
    [audience, enabled],
  );
  const statusSnapshot = useCallback(
    () => (enabled ? getEcho(audience).connectionStatus() : "disconnected"),
    [audience, enabled],
  );
  const status = useSyncExternalStore(subscribeStatus, statusSnapshot, serverStatusSnapshot);

  useEffect(() => {
    if (!enabled) return;

    const echo = getEcho(audience);
    const subscription = echo.private(channel);

    const handler = (log: GatewayLogEvent) => {
      if (!matchesScope(log, platform, userUuid)) return;
      const error = isError(log);
      arrivalsRef.current.push({ at: Date.now(), error });
      setTotal((current) => current + 1);
      if (error) setErrorTotal((current) => current + 1);
    };

    subscription.listen(EVENT, handler);

    return () => {
      subscription.stopListening(EVENT, handler);
      // Deliberately no echo.leave(channel) — see useGatewayLogFeed: the
      // channel is shared with other listeners and leave() would tear it down
      // for all of them.
    };
  }, [audience, channel, platform, userUuid, enabled]);

  // Redraw several times a second. Deriving the whole array each time is what
  // makes the trace scroll: every redraw each bin's fractional offset sits a
  // little further left, anything past the window falls off the end, and a
  // quiet feed decays to a flat baseline rather than freezing at its last
  // value.
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const now = Date.now();
      // One extra second of slack so a bin still on screen is not dropped
      // while the chart is still animating it off the left edge.
      const cutoff = now - (LIVE_WINDOW_SECONDS + 2) * 1000;
      arrivalsRef.current = arrivalsRef.current.filter((a) => a.at > cutoff);

      setBins(buildBins(arrivalsRef.current, now));
    }, LIVE_TICK_MS);
    return () => clearInterval(id);
  }, [enabled]);

  return { bins, total, errorTotal, status };
}
