"use client";

import { useEffect, useRef } from "react";

// Runs `reset` when this route is navigated away from — and again on unmount.
//
// For state that has no reliable user-initiated reset event. `cacheComponents`
// renders routes inside React `<Activity>`, so navigating away HIDES a route
// instead of unmounting it: `useState` and raw DOM input values survive for the
// few most recently visited routes. Most of that is a feature (a half-typed
// draft is still there when you come back). Some of it is not — anything that
// EXPIRES while hidden comes back looking valid and is not.
//
// Activity tears effects down when it hides a route and re-creates them when it
// shows it again, which makes an effect cleanup the documented hook for this.
export function useResetOnHide(reset: () => void) {
  // The callback is re-created every render by every caller; keeping the latest
  // in a ref lets the effect below run with empty deps, so it is torn down ONLY
  // when the route is hidden rather than on every render.
  const latest = useRef(reset);
  useEffect(() => {
    latest.current = reset;
  }, [reset]);

  useEffect(() => () => latest.current(), []);
}
