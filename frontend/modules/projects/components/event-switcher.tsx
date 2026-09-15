"use client";

import { useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateSearchParams } from "@/hooks/use-update-search-params";
import { isEventActive } from "@/types/project";
import type { EgovEvent } from "@/types/project";

// Switches which event's projects are shown. The slug travels as a query
// param rather than in the path deliberately: slugs are regenerated whenever
// an event is renamed, so a slug baked into a URL would 404 the day somebody
// edits a title. A stale ?event= falls back to the newest event instead.
export function EventSwitcher({
  events,
  current,
}: {
  events: EgovEvent[];
  current: string;
}) {
  const params = useSearchParams();
  const update = useUpdateSearchParams();

  // `items` is what makes the trigger render the event NAME rather than the
  // raw slug it is keyed by.
  const items = Object.fromEntries(events.map((event) => [event.slug, event.name]));

  // The directory carries past events now, so the list is split rather than
  // run together: "eGov Hackathon 2025" sitting unlabelled next to a running
  // programme reads as another thing you can enter. A closed event's entries
  // stay browsable, which is the whole point of listing it.
  const ongoing = events.filter(isEventActive);
  const past = events.filter((event) => !isEventActive(event));
  // Headings only earn their place once there is something to tell apart.
  const grouped = ongoing.length > 0 && past.length > 0;

  return (
    <Select
      value={params.get("event") ?? current}
      items={items}
      onValueChange={(slug) => update({ event: slug }, { resetPage: true })}
    >
      <SelectTrigger aria-label="Choose an event" className="w-64">
        <CalendarRange aria-hidden className="size-4 text-muted-foreground" />
        <SelectValue placeholder="Event" />
      </SelectTrigger>
      <SelectContent>
        {grouped ? (
          <>
            <SelectGroup>
              <SelectLabel>Ongoing</SelectLabel>
              {ongoing.map((event) => (
                <SelectItem key={event.slug} value={event.slug}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Past</SelectLabel>
              {past.map((event) => (
                <SelectItem key={event.slug} value={event.slug}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        ) : (
          events.map((event) => (
            <SelectItem key={event.slug} value={event.slug}>
              {event.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
