"use client";

import { useEffect, useRef } from "react";
import { getEcho } from "@/lib/echo-client";
import type { NotificationCreatedEvent } from "@/types/notification";

// Echo's custom-name binding needs the leading dot, or it namespaces the event
// and never matches what the backend broadcasts.
const EVENT = ".notification.created";

// New notifications arriving on the user's own private channel.
//
// This is the SAME channel the gateway-log feed uses (`user.{uuid}`), which is
// why there is no second socket and no second auth endpoint — getEcho keys one
// instance per audience, so both features share the connection.
//
// The callback is held in a ref rather than listed as a dependency. The bell
// passes a closure over its own state setters, so a fresh function identity
// arrives on every render; depending on it directly would tear down and
// re-authorize the subscription several times a second.
export function useNotificationStream({
  channel,
  onCreated,
}: {
  // `user.{uuid}` — Echo.private() prepends "private-" itself. Null when the
  // uuid is not known, which unsubscribes rather than guessing a channel.
  channel: string | null;
  onCreated: (notification: NotificationCreatedEvent) => void;
}) {
  const handler = useRef(onCreated);
  // Assigned in an effect, not during render: writing a ref while rendering
  // is a React Compiler violation (react-hooks/refs), and the subscription
  // effect below only ever reads it after commit anyway.
  useEffect(() => {
    handler.current = onCreated;
  }, [onCreated]);

  useEffect(() => {
    if (!channel) return;

    // getEcho touches window and must never run during render or on the
    // server; inside an effect is the one safe place.
    const echo = getEcho("client");
    const listener = (event: NotificationCreatedEvent) => {
      // Defensive: a malformed frame should not take down the header on
      // every authenticated page.
      if (!event || typeof event.id !== "number") return;
      handler.current(event);
    };
    const subscription = echo.private(channel).listen(EVENT, listener);

    return () => {
      // The OWN listener only: stopListening without the callback removes
      // every binding for the event, other subscribers' included.
      subscription.stopListening(EVENT, listener);
      // Deliberately no echo.leave(channel) — same rule as
      // useLiveUsageRate: `user.{uuid}` is SHARED (the bell, the
      // notifications page's live refresh, the gateway-log feed), and
      // leave() tears the whole channel down for every listener. The bell
      // sits in the header of every authenticated page, so the moment the
      // notifications page unmounted its refresher, the bell went deaf for
      // the rest of the visit.
    };
  }, [channel]);
}
