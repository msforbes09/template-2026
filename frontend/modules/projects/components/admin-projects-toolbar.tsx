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
import type { AdminEgovEvent } from "@/types/project";

// Search and event only. `status` and `is_published` belong to the sidebar's
// Projects submenu, whose queues (Published / Hidden / Pending Changes)
// express visibility where it actually means something — a second control
// writing the same params was the duplication that made the toolbar noisy.
// The claim axis went the same way: ?claimed=me is reached from the dashboard
// card and the conflict dialog, which is where an admin is when they want it.

export function AdminProjectsToolbar({ events = [] }: { events?: AdminEgovEvent[] }) {
  const params = useSearchParams();
  const update = useUpdateSearchParams();

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchFilterInput
          label="Search projects"
          placeholder="Search by name…"
          className="sm:max-w-xs"
        />
        {events.length > 0 && (
          <Select
            value={params.get("egov_event_id") ?? "all"}
            items={{
              all: "All events",
              ...Object.fromEntries(events.map((e) => [String(e.id), e.name])),
            }}
            onValueChange={(value) =>
              update({ egov_event_id: value === "all" ? null : value }, { resetPage: true })
            }
          >
            <SelectTrigger aria-label="Filter by event" className="sm:w-52">
              <SelectValue placeholder="Event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={String(event.id)}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
