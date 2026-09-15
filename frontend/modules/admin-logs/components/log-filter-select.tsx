"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateSearchParams } from "@/hooks/use-update-search-params";

// Sentinel for "no filter". A Select can't hold "" as a value without
// rendering blank, so the cleared state gets its own token and is translated
// back to a removed URL param on change.
const ALL = "__all__";

// One URL-driven term filter — platform, type, status_code, guard, event,
// auditable_type. Every admin log list needs two or three of these and they
// differ only in param name, label and options, so they share one component
// rather than each list writing its own Select.
export function LogFilterSelect({
  param,
  label,
  value,
  options,
  allLabel = "All",
  className = "sm:w-44",
}: {
  // The URL search param this filter writes to, which is also the API's query
  // param name — they're deliberately the same so the list can forward the
  // value straight into the query builder.
  param: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  allLabel?: string;
  className?: string;
}) {
  const update = useUpdateSearchParams();

  // A value filtered on but missing from the options (a partner since removed,
  // an event this page has never seen) still needs an entry, or the Select
  // renders blank and silently drops a filter that's actually applied.
  const items =
    value && !options.some((option) => option.value === value)
      ? [...options, { value, label: value }]
      : options;

  return (
    <Select
      value={value || ALL}
      onValueChange={(next) =>
        update({ [param]: next === ALL ? null : next }, { resetPage: true, scroll: false })
      }
    >
      <SelectTrigger aria-label={label} className={className}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {items.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
