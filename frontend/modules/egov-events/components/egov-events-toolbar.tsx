"use client";

import { SearchFilterInput } from "@/components/ui/search-filter-input";
import { useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateSearchParams } from "@/hooks/use-update-search-params";

const ACTIVE_LABELS: Record<string, string> = {
  all: "Active and closed",
  "1": "Accepting projects",
  "0": "Closed",
};

const VISIBILITY_LABELS: Record<string, string> = {
  all: "All visibility",
  "1": "Public",
  "0": "Hidden",
};

export function EgovEventsToolbar() {
  const params = useSearchParams();
  const update = useUpdateSearchParams();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <SearchFilterInput
        label="Search events"
        placeholder="Search by name…"
        className="sm:max-w-xs"
      />
      <Select
        value={params.get("is_active") ?? "all"}
        items={ACTIVE_LABELS}
        onValueChange={(value) =>
          update({ is_active: value === "all" ? null : value }, { resetPage: true })
        }
      >
        <SelectTrigger aria-label="Filter by whether the event accepts projects" className="sm:w-48">
          <SelectValue placeholder="Accepting projects" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(ACTIVE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Separate control, because the two flags are independent: a closed
          event is normally still published, and a hidden one can still be
          accepting entries. */}
      <Select
        value={params.get("is_published") ?? "all"}
        items={VISIBILITY_LABELS}
        onValueChange={(value) =>
          update({ is_published: value === "all" ? null : value }, { resetPage: true })
        }
      >
        <SelectTrigger aria-label="Filter by public visibility" className="sm:w-48">
          <SelectValue placeholder="Visibility" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
