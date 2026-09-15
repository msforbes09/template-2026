"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { ConnectionStatus } from "laravel-echo";
import { getEcho, type EchoAudience } from "@/lib/echo-client";
import type { GatewayLogEvent } from "@/types/gateway-log";

// Echo's custom-name binding needs the leading dot, or it namespaces the
// event and never matches what the backend broadcasts.
const EVENT = ".gateway.log";

// The live tail is a bounded buffer: the REST list is the source of truth and
// pages the rest, so there's no reason to let a busy feed grow the DOM without
// limit.
const MAX_LIVE_ROWS = 50;

// Rolling window behind the "calls in the last minute" rate readout.
const RATE_WINDOW_MS = 60_000;

export type GatewayLogFeedOptions = {
  // Which socket to use — decides the channel-auth endpoint and guard.
  audience: EchoAudience;
  // "administrators" (shared admin feed) or `user.${uuid}` (a citizen's own).
  // Echo.private() prepends "private-" itself.
  channel: string;
  // Platform filter currently applied to the list, "" for all. Live rows are
  // filtered the same way the REST query is, so the tally and the rows always
  // agree with what's on screen.
  platform?: string;
  // Admin per-user scope: keep only this citizen's calls. There is one admin
  // channel by design; the per-user screen is this filter.
  userUuid?: string | null;
  // Whether new rows should accumulate for display. False on any view a live
  // row doesn't belong in — page 2+, or a past month — where prepending
  // "now" to the top would misrepresent the page. Counting can still be on.
  append: boolean;
  // Whether to tally events at all. False when the list is scoped to a month
  // that isn't the current one, since incoming events don't belong to it.
  enabled: boolean;
};

export type GatewayLogFeed = {
  // Newest first, capped at MAX_LIVE_ROWS. Empty unless `append`.
  rows: GatewayLogEvent[];
  // Matching events seen since mount — seed a total with the paginator's
  // meta.total and add this.
  received: number;
  // Matching events within the last minute (rolling).
  ratePerMinute: number;
  status: ConnectionStatus;
};

// getEcho() must never run server-side; SSR always starts "connecting".
function serverStatusSnapshot(): ConnectionStatus {
  return "connecting";
}

// Subscribes to the `gateway.log` broadcast and exposes it as a live tail
// over the REST list. The list stays the source of truth (it has the history
// and the paging); this only adds what arrives after it rendered.
//
// On reconnect it refetches rather than trusting the socket to catch up: the
// stream is append-only and replays nothing, so anything that happened while
// the socket was down exists only in the REST list.
export function useGatewayLogFeed({
  audience,
  channel,
  platform = "",
  userUuid,
  append,
  enabled,
}: GatewayLogFeedOptions): GatewayLogFeed {
  const router = useRouter();
  const [rows, setRows] = useState<GatewayLogEvent[]>([]);
  const [received, setReceived] = useState(0);
  const [ratePerMinute, setRatePerMinute] = useState(0);
  // Arrival timestamps inside the rate window. A ref, not state — recording
  // an arrival shouldn't itself render; the interval below publishes the
  // derived count.
  const arrivalsRef = useRef<number[]>([]);

  // Connection status is an external system's current value — the textbook
  // useSyncExternalStore case rather than setState-in-effect (which the React
  // Compiler's eslint rule flags as a cascading-render risk).
  //
  // Both callbacks no-op while disabled, because getEcho() *opens the socket*
  // — reading the status eagerly would connect on every visit to a past month
  // or a citizen without a uuid, none of which ever subscribe to anything.
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
      // Same filtering the REST query applies, so the live rows and the
      // count never drift from the list they sit above.
      if (platform && log.platform !== platform) return;
      if (userUuid && log.user_uuid !== userUuid) return;

      arrivalsRef.current.push(Date.now());
      setReceived((current) => current + 1);
      if (append) {
        setRows((current) => {
          // The same log can arrive twice — once live, once in the refetched
          // page after a reconnect. The broadcast carries the same composite
          // id the list rows do (handoff §6), so comparing ids is exact
          // across months rather than only within one.
          if (current.some((row) => row.id === log.id)) return current;
          return [log, ...current].slice(0, MAX_LIVE_ROWS);
        });
      }
    };

    subscription.listen(EVENT, handler);

    return () => {
      subscription.stopListening(EVENT, handler);
      // Deliberately no echo.leave(channel): `administrators` is shared with
      // the activation feeds, and leave() tears the whole channel down for
      // every listener on it. Dropping our own listener is the correct
      // scope — see ActivationNotificationFeed, which owns that lifecycle.
    };
  }, [audience, channel, platform, userUuid, append, enabled]);

  // Publishes the rolling rate once a second and expires old arrivals. Runs
  // on a timer rather than per-event so the number still falls back to zero
  // when the feed goes quiet.
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const cutoff = Date.now() - RATE_WINDOW_MS;
      arrivalsRef.current = arrivalsRef.current.filter((at) => at > cutoff);
      setRatePerMinute(arrivalsRef.current.length);
    }, 1_000);
    return () => clearInterval(id);
  }, [enabled]);

  // Refetch on reconnect to fill the gap. Only on a genuine reconnect — the
  // first connect happens right after the server already rendered the list,
  // so refreshing there would just repeat the request that produced it.
  const wasConnectedRef = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    if (status === "connected") {
      if (wasConnectedRef.current) router.refresh();
      wasConnectedRef.current = true;
    }
  }, [status, enabled, router]);

  return { rows, received, ratePerMinute, status };
}
