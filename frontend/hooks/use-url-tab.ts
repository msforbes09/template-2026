"use client";

import { useCallback, useSyncExternalStore } from "react";

// Tab selection held in the URL rather than component state, so a tab can be
// linked to and survives a refresh — and so the page around the tabs can see
// which one is open, which local state inside a Tabs root never exposes.
//
// ── Why this does NOT use useSearchParams ──────────────────────────────────
//
// It is the obvious tool and it is the wrong one for a tab strip that wraps
// page content: `useSearchParams()` opts its whole subtree out of static
// prerendering. On the anonymous catalog page — prerendered per catalog to be
// crawled — that took the prerendered shell from 64KB to 23KB, dropping the
// tab strip and the entire OpenAPI spec out of the HTML. Measured by building
// both ways, not assumed.
//
// So the URL is read through useSyncExternalStore, whose server snapshot is
// empty (the fallback tab). The server renders the default, which keeps the
// content in the static output; the client reads the real value on hydration.
// Deep-linking to a non-default tab therefore shows the default for one frame
// before switching — cheap, since panels are kept mounted.
//
// Writes go through history.replaceState rather than router.replace: a tab
// needs no server round-trip, the URL updates synchronously so the store reads
// back what it just wrote, and Next syncs its router from the native history
// API. replaceState rather than push, so tabbing does not fill the back stack.

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  window.addEventListener("popstate", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("popstate", onStoreChange);
  };
}

// Resolves a raw URL value against the tabs a page actually renders.
//
// A value naming a tab that isn't there would leave the Tabs root pointing at
// a panel that does not exist — a blank page. Anything unrecognised or
// unavailable falls back, so a hand-typed or stale URL degrades to the default
// rather than to nothing.
export function resolveTab<T extends string>(
  raw: string | null,
  available: readonly T[],
  fallback: T,
): T {
  return available.find((candidate) => candidate === raw) ?? fallback;
}

export function useUrlTab<T extends string>({
  available,
  fallback,
  param = "tab",
}: {
  available: readonly T[];
  fallback: T;
  param?: string;
}): { active: T; select: (value: string) => void } {
  const getSnapshot = useCallback(
    () => new URLSearchParams(window.location.search).get(param) ?? "",
    [param],
  );
  // Prerender and hydration both see the fallback — this is what keeps the
  // panels in the static HTML.
  const getServerSnapshot = useCallback(() => "", []);

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const active = resolveTab(raw || null, available, fallback);

  const select = useCallback(
    (value: string) => {
      const next = resolveTab(value, available, fallback);
      const params = new URLSearchParams(window.location.search);
      // The default drops the param rather than writing it out, so the plain
      // address of the page stays canonical.
      if (next === fallback) {
        params.delete(param);
      } else {
        params.set(param, next);
      }
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}`,
      );
      emit();
    },
    [available, fallback, param],
  );

  return { active, select };
}
