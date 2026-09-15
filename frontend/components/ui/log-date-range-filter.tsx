"use client";

import { useState } from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUpdateSearchParams } from "@/hooks/use-update-search-params";
import { isValidLogDate } from "@/lib/log-date";

// The from/to range every log list shares — the admin lists and, since the
// 2026-08-17 handoff moved it off month-scoping, the citizen's own usage list
// too. Lives in components/ui rather than a feature module because a second
// audience now needs it. Both ends live in the URL —
// they have to survive a refresh and be shareable, same rule as every other
// filter in this app (never useState for filter values). The popover's own
// open/closed flag is the only local state, which is ephemeral UI and so is
// exactly what useState is for.
//
// The API wants plain YYYY-MM-DD on both ends, inclusive, and the range spans
// months — these lists are no longer month-scoped.

// Parses a URL value into a Date for the calendar. Anything malformed reads as
// "no bound set" rather than as an invalid Date, which would render the
// calendar blank.
function toDate(value: string | undefined): Date | undefined {
  if (!isValidLogDate(value)) return undefined;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : undefined;
}

function toParam(date: Date | undefined): string | null {
  // Formatted from the local date parts, never toISOString() — that shifts to
  // UTC and can land the user a day earlier than the one they clicked.
  return date ? format(date, "yyyy-MM-dd") : null;
}

function label(from: Date | undefined, to: Date | undefined): string {
  if (from && to) return `${format(from, "d MMM yyyy")} – ${format(to, "d MMM yyyy")}`;
  if (from) return `From ${format(from, "d MMM yyyy")}`;
  if (to) return `Until ${format(to, "d MMM yyyy")}`;
  return "Any date";
}

export function LogDateRangeFilter({ from, to }: { from?: string; to?: string }) {
  const update = useUpdateSearchParams();
  const [open, setOpen] = useState(false);

  const selected: DateRange | undefined = (() => {
    const start = toDate(from);
    const end = toDate(to);
    return start || end ? { from: start, to: end } : undefined;
  })();

  const hasRange = Boolean(selected?.from || selected?.to);

  function apply(range: DateRange | undefined) {
    // Both ends move together in one navigation — writing them separately
    // would fire two requests and briefly query a half-updated range.
    update(
      { from: toParam(range?.from), to: toParam(range?.to) },
      { resetPage: true, scroll: false },
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              // Announces the current range rather than just "Date range", so
              // the active filter is audible without hunting for the label.
              aria-label={`Filter by date range: ${label(selected?.from, selected?.to)}`}
              className="justify-start gap-2 font-normal sm:w-64"
            />
          }
        >
          <CalendarIcon aria-hidden data-icon="inline-start" />
          <span className={hasRange ? undefined : "text-muted-foreground"}>
            {label(selected?.from, selected?.to)}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            autoFocus
            selected={selected}
            onSelect={apply}
            numberOfMonths={2}
            // Future logs don't exist, so the range can't usefully run past
            // today. Keeps the picker honest rather than returning nothing.
            disabled={{ after: new Date() }}
            className="p-3"
          />
        </PopoverContent>
      </Popover>
      {hasRange && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Clear date range"
          onClick={() => {
            apply(undefined);
            setOpen(false);
          }}
        >
          <X aria-hidden />
        </Button>
      )}
    </div>
  );
}
