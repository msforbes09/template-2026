"use client";

import { useCallback, useSyncExternalStore } from "react";

// Same-tab writes don't fire the browser's `storage` event, so writers
// notify subscribers directly through this set.
const listeners = new Set<() => void>();
function emit() {
  for (const listener of listeners) listener();
}

// Values that couldn't be written to localStorage (blocked/full) — read
// falls back here so editing keeps working without persistence.
const overrides = new Map<string, string>();

// A single string persisted in localStorage, exposed as an external store —
// same hydration-safe shape as use-persistent-variables.ts: the server
// snapshot is the default, the first client read returns the saved value.
export function usePersistentValue(
  storageKey: string,
  defaultValue: string,
): [string, (next: string) => void, () => void] {
  const read = useCallback((): string => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(storageKey);
    } catch {
      // blocked storage — fall through to overrides/default
    }
    return raw ?? overrides.get(storageKey) ?? defaultValue;
  }, [storageKey, defaultValue]);

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

  const value = useSyncExternalStore(subscribe, read, () => defaultValue);

  const setValue = useCallback(
    (next: string) => {
      try {
        localStorage.setItem(storageKey, next);
        overrides.delete(storageKey);
      } catch {
        overrides.set(storageKey, next);
      }
      emit();
    },
    [storageKey],
  );

  const clearValue = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // nothing to clear if storage is blocked
    }
    overrides.delete(storageKey);
    emit();
  }, [storageKey]);

  return [value, setValue, clearValue];
}
