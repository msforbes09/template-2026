import { ScrollText } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { requireAdminSession } from "@/lib/auth/dal";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { AdminLogsError } from "@/modules/admin-logs/components/admin-logs-states";
import { ConnectionLogTable } from "@/modules/admin-logs/components/connection-log-table";
import { LogDateRangeFilter } from "@/components/ui/log-date-range-filter";
import { ClearLogFiltersButton } from "@/components/ui/clear-log-filters-button";
import { LogFilterInput } from "@/modules/admin-logs/components/log-filter-input";
import { LogFilterSelect } from "@/modules/admin-logs/components/log-filter-select";
import {
  ADMIN_LOGS_PER_PAGE,
  buildAdminLogQuery,
} from "@/modules/admin-logs/lib/build-admin-log-query";
import { CONNECTION_TYPES } from "@/modules/admin-logs/lib/connection-types";
import type { ConnectionLogListItem } from "@/types/operational-log";
import type { Paginated } from "@/types/pagination";

// The full set the backend can write, not derived from the rows on screen —
// so a type with no hits in the current range is still selectable.
const TYPE_OPTIONS = CONNECTION_TYPES.map((value) => ({ value, label: value }));

export async function ConnectionLogsList({
  type,
  statusCode,
  reference,
  from,
  to,
  page,
}: {
  type: string;
  statusCode: string;
  reference: string;
  from: string;
  to: string;
  page: string;
}) {
  await requireAdminSession();

  const query = buildAdminLogQuery({
    filters: { type, status_code: statusCode, reference },
    from,
    to,
    page,
  });

  let response: Paginated<ConnectionLogListItem>;
  try {
    response = await apiFetch<Paginated<ConnectionLogListItem>>(
      `/connection-logs?${query}`,
      { cache: "no-store" },
      "admin",
    );
  } catch (err) {
    return (
      <AdminLogsError error={err} label="connection logs" permission="connection-logs-view" />
    );
  }

  const logs = response.data;
  const meta = response.meta ?? {
    current_page: Number(page) || 1,
    last_page: 1,
    per_page: ADMIN_LOGS_PER_PAGE,
    total: logs.length,
    from: logs.length ? 1 : null,
    to: logs.length || null,
  };

  return (
    <section aria-label="Connection logs" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <LogDateRangeFilter from={from} to={to} />
        <LogFilterSelect
          param="type"
          label="Filter by type"
          value={type}
          allLabel="All types"
          options={TYPE_OPTIONS}
        />
        <LogFilterInput
          param="status_code"
          label="Filter by status code"
          value={statusCode}
          placeholder="Status code"
          className="sm:w-32"
        />
        <LogFilterInput
          param="reference"
          label="Filter by reference"
          value={reference}
          placeholder="Reference"
          className="sm:w-56"
        />
        <ClearLogFiltersButton />
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No connection logs match these filters"
          description="Widen the date range or clear the type, status and reference filters. Status and reference match exactly. The range is inclusive on both ends and can span months."
        />
      ) : (
        <>
          <ConnectionLogTable logs={logs} />
          <PaginationBar meta={meta} />
        </>
      )}
    </section>
  );
}
