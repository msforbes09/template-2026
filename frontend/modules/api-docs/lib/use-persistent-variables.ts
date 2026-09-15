"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

// Same-tab writes don't fire the browser's `storage` event, so writers
// notify subscribers directly through this set.
const listeners = new Set<() => void>();
function emit() {
  for (const listener of listeners) listener();
}

type Cache = {
  storageKey: string;
  defaults: Record<string, string>;
  raw: string | null;
  value: Record<string, string>;
};

// Variable values persisted per collection in this browser's localStorage.
// Modeled as an external store (useSyncExternalStore) rather than
// state-synced-in-an-effect: the server snapshot is the collection's
// defaults, and the first client read layers the saved values on top —
// hydration-safe without a cascading post-mount setState.
export function usePersistentVariables(storageKey: string, defaults: Record<string, string>) {
  const cacheRef = useRef<Cache | null>(null);

  const read = useCallback((): Record<string, string> => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(storageKey);
    } catch {
      // blocked storage — fall through with defaults only
    }
    const cache = cacheRef.current;
    if (cache && cache.storageKey === storageKey && cache.defaults === defaults && cache.raw === raw) {
      return cache.value; // stable reference for unchanged snapshots
    }
    let saved: Record<string, string> = {};
    if (raw) {
      try {
        saved = JSON.parse(raw) as Record<string, string>;
      } catch {
        // corrupted entry — ignore it
      }
    }
    const value = { ...defaults, ...saved };
    cacheRef.current = { storageKey, defaults, raw, value };
    return value;
  }, [storageKey, defaults]);

  const subscribe = useCallback(
    (onChange: () => void) => {
      listeners.add(onChange);
      const onStorage = (event: StorageEvent) => {
        if (event.key === storageKey) onChange();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(onChange);
        window.removeEventListener("storage", onStorage);
      };
    },
    [storageKey],
  );

  const variables = useSyncExternalStore(subscribe, read, () => defaults);

  const write = useCallback(
    (next: Record<string, string>) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // storage full/blocked — the in-memory snapshot still updates via cache
        cacheRef.current = { storageKey, defaults, raw: null, value: next };
      }
      emit();
    },
    [storageKey, defaults],
  );

  const setVariable = useCallback(
    (key: string, value: string) => {
      write({ ...read(), [key]: value });
    },
    [read, write],
  );

  const removeVariable = useCallback(
    (key: string) => {
      const next = { ...read() };
      delete next[key];
      write(next);
    },
    [read, write],
  );

  return { variables, setVariable, removeVariable };
}
