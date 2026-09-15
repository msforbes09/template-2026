"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogDateRangeFilter } from "@/components/ui/log-date-range-filter";
import { ClearLogFiltersButton } from "@/components/ui/clear-log-filters-button";
import { LogFilterInput } from "@/modules/admin-logs/components/log-filter-input";
import { useUpdateSearchParams } from "@/hooks/use-update-search-params";

const ALL_PLATFORMS = "all";

// Filters live in the URL, never in component state — they have to be
// shareable and survive a refresh.
//
// The month select this used to carry is gone: the endpoint no longer accepts
// `month` (2026-08-17 handoff), and leaving the picker in place would have been
// worse than removing it — it would have kept labelling an unfiltered,
// all-time list as a single month.
export function GatewayLogsToolbar({
  from,
  to,
  platform = "",
  platformOptions = [],
  statusCode = "",
  scroll = true,
}: {
  from?: string;
  to?: string;
  // Exact-match HTTP status (free text). Every gateway-log list endpoint
  // accepts it, so this renders on all three views.
  statusCode?: string;
  // Both omitted on a view that's already fixed to one platform (the
  // per-catalog usage tab): there's nothing to choose between, so only the
  // date range renders.
  platform?: string;
  // Partner slugs, taken from the API catalog (a catalog's identifier is its
  // gateway platform slug). Empty when the catalog couldn't be read — the date
  // range still works on its own.
  platformOptions?: string[];
  scroll?: boolean;
}) {
  const update = useUpdateSearchParams();

  // A platform that's filtered on but missing from the catalog list (e.g. a
  // partner that has since been removed) still needs an entry, or the Select
  // would render blank and silently drop the active filter.
  const platforms =
    platform && !platformOptions.includes(platform)
      ? [...platformOptions, platform]
      : platformOptions;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <LogDateRangeFilter from={from} to={to} />
      {platforms.length > 0 && (
        <Select
          value={platform || ALL_PLATFORMS}
          onValueChange={(value) =>
            update(
              { platform: value === ALL_PLATFORMS ? null : value },
              { resetPage: true, scroll },
            )
          }
        >
          <SelectTrigger aria-label="Filter by platform" className="sm:w-48">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PLATFORMS}>All platforms</SelectItem>
            {platforms.map((slug) => (
              <SelectItem key={slug} value={slug}>
                {slug}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <LogFilterInput
        param="status_code"
        label="Filter by status code"
        value={statusCode}
        placeholder="Status code"
        className="sm:w-32"
      />
      {/* keep `tab`: ClearLogFiltersButton counts every non-`page` param as a
          filter, and this toolbar also renders on the catalog page's ?tab=usage
          view — where the button would otherwise show permanently and, when
          clicked, drop the tab and throw the reader back to the documentation. */}
      <ClearLogFiltersButton keep={["tab"]} />
    </div>
  );
}
