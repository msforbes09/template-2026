"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { debounce } from "lodash-es";
import { Input } from "@/components/ui/input";
import { useUpdateSearchParams } from "@/hooks/use-update-search-params";
import { syncFilterText } from "@/lib/sync-filter-text";

// The one search box every URL-driven list uses.
//
// It exists because the eight toolbars it replaces were all uncontrolled —
// `defaultValue={params.get("q")}` — which reads the URL exactly once, on
// mount. That is fine until something changes the URL WITHOUT unmounting the
// toolbar, and two things routinely do:
//
//   - a sidebar link to the same route with different params (the Users and
//     Projects status submenus link to ?status=… and drop ?q= entirely), and
//   - a "clear filters" control, which rewrites the query in place.
//
// In both cases the list stopped being filtered while the box still showed the
// term, so the screen contradicted itself. cacheComponents makes it worse
// still: a hidden route keeps its DOM, so even leaving and coming back does not
// necessarily clear it.
//
// Controlled and re-seeded from the URL instead, so a bare URL always renders
// an empty box and the box can never disagree with the list it sits above.
export function SearchFilterInput({
  param = "q",
  label,
  placeholder,
  className = "sm:max-w-xs",
  delay = 300,
}: {
  // The URL search param this writes to. Defaults to the `q` every list
  // toolbar already uses.
  param?: string;
  // The accessible name. Also the placeholder unless one is given.
  label: string;
  placeholder?: string;
  className?: string;
  delay?: number;
}) {
  const params = useSearchParams();
  const update = useUpdateSearchParams();
  const value = params.get(param) ?? "";

  // Re-seeded when the URL changes from OUTSIDE — a status-nav click, a clear
  // button, the back button. Our own debounced push echoes back through the
  // same param a beat later, and that echo is recognised (lastPushed) and
  // ignored, or the echo of "ju" would clobber a box that already reads "juan".
  //
  // Adjust-state-during-render, per React's guidance, rather than an effect:
  // an effect would paint the stale value first and correct it on the next
  // frame. Same shape as LogFilterInput, which had this right already.
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);
  const [lastPushed, setLastPushed] = useState(value);
  const sync = syncFilterText(value, seen, lastPushed);
  if (sync.changed) {
    setSeen(value);
    if (sync.adopt) setText(value);
  }

  const push = useMemo(
    () =>
      debounce((next: string) => {
        const trimmed = next.trim();
        setLastPushed(trimmed);
        update({ [param]: trimmed || null }, { resetPage: true });
      }, delay),
    [param, delay, update],
  );

  // Without this a trailing call survives the component and fires against a URL
  // that has since moved on, re-adding a filter the user just cleared.
  useEffect(() => () => push.cancel(), [push]);

  return (
    <Input
      aria-label={label}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        push(event.target.value);
      }}
      placeholder={placeholder ?? label}
      className={className}
    />
  );
}
