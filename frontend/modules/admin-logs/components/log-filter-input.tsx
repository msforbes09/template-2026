"use client";

import { useEffect, useMemo, useState } from "react";
import { debounce } from "lodash-es";
import { Input } from "@/components/ui/input";
import { useUpdateSearchParams } from "@/hooks/use-update-search-params";
import { syncFilterText } from "@/lib/sync-filter-text";

// The free-text sibling of LogFilterSelect: one URL-driven term filter for
// values that are open-ended (a correlation reference, an arbitrary HTTP
// status) where a fixed option list would only get in the way. The API still
// matches exactly, so the input is a plain value box, not a search box.
export function LogFilterInput({
  param,
  label,
  value,
  placeholder,
  className = "sm:w-44",
}: {
  // The URL search param this filter writes to — also the API's query param
  // name, so the list can forward it straight into the query builder.
  param: string;
  label: string;
  value: string;
  placeholder?: string;
  className?: string;
}) {
  const update = useUpdateSearchParams();

  // Controlled, but re-seeded when the URL value changes from *outside* — a
  // badge click that applies this filter has to show up in the box, not just
  // in the results. Our own debounced pushes echo back through the same prop
  // a beat late, so those are recognised (lastPushed) and ignored, or the
  // echo of "4" would clobber a box that already reads "42".
  // Adjust-state-during-render, per React's guidance, rather than an effect.
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);
  const [lastPushed, setLastPushed] = useState(value);
  const sync = syncFilterText(value, seen, lastPushed);
  if (sync.changed) {
    setSeen(value);
    if (sync.adopt) setText(value);
  }

  const onChange = useMemo(
    () =>
      debounce((next: string) => {
        const trimmed = next.trim();
        setLastPushed(trimmed);
        update({ [param]: trimmed || null }, { resetPage: true, scroll: false });
      }, 300),
    [param, update],
  );

  // Otherwise a trailing call outlives the component and writes against a URL
  // that has since moved on, re-adding a filter the user just cleared.
  useEffect(() => () => onChange.cancel(), [onChange]);

  return (
    <Input
      aria-label={label}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        onChange(event.target.value);
      }}
      placeholder={placeholder ?? label}
      className={className}
    />
  );
}
