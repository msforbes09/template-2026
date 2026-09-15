"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// The single writer for every URL-driven filter, search and pagination control.
//
// The returned callback is STABLE — it does not change identity when the URL
// does. That matters because callers memoise a debounced wrapper around it
// (`useMemo(() => debounce(...), [update])`). When `update` changed on every
// URL change, each change built a NEW debouncer while the previous one's
// trailing call was left pending and uncancelled, and that call still closed
// over the params as they were when it was created. Typing, then clearing a
// filter, could see the stale trailing write land afterwards and put the filter
// straight back.
//
// Latest pathname and params are read through refs at call time instead, so a
// debounced write always acts on the URL as it is when it fires, not as it was
// when the timer started.
export function useUpdateSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Seeded at mount and refreshed after each commit. Written in an effect, not
  // during render: the React Compiler rejects a render-phase ref write
  // (react-hooks/refs), and nothing here needs the newer value before the
  // effect runs — a debounced write fires from a timer, which is always a later
  // task than the commit that preceded it.
  const latest = useRef({ pathname, params });
  useEffect(() => {
    latest.current = { pathname, params };
  }, [pathname, params]);

  return useCallback(
    (
      updates: Record<string, string | null>,
      // `scroll: false` keeps the viewport where it is. Needed wherever the
      // control sits well down the page — a filter inside a tab, say — since
      // the default jumps back to the top of the segment on navigation.
      opts?: { resetPage?: boolean; scroll?: boolean },
    ) => {
      const { pathname: currentPath, params: currentParams } = latest.current;
      const next = new URLSearchParams(currentParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }
      if (opts?.resetPage) next.delete("page");
      const query = next.toString();
      router.replace(query ? `${currentPath}?${query}` : currentPath, {
        scroll: opts?.scroll ?? true,
      });
    },
    [router],
  );
}
