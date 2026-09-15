import { History } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { requireAdminSession } from "@/lib/auth/dal";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { AdminLogsError } from "@/modules/admin-logs/components/admin-logs-states";
import { AuditLogTable } from "@/modules/admin-logs/components/audit-log-table";
import { LogDateRangeFilter } from "@/components/ui/log-date-range-filter";
import { ClearLogFiltersButton } from "@/components/ui/clear-log-filters-button";
import { LogFilterInput } from "@/modules/admin-logs/components/log-filter-input";
import { LogFilterSelect } from "@/modules/admin-logs/components/log-filter-select";
import {
  ADMIN_LOGS_PER_PAGE,
  buildAdminLogQuery,
} from "@/modules/admin-logs/lib/build-admin-log-query";
import { ACTOR_TYPES, AUDIT_EVENTS, AUDITABLE_TYPES } from "@/modules/admin-logs/lib/audit-options";
import { humanize } from "@/lib/humanize";
import type { AuditLogListItem } from "@/types/operational-log";
import type { Paginated } from "@/types/pagination";

// Both lists are the full sets the backend can write (see audit-options.ts),
// not derived from the rows on screen — so a subject type or event with no
// hits in the current range is still selectable.
const EVENT_OPTIONS = AUDIT_EVENTS.map((value) => ({ value, label: humanize(value) }));

const TYPE_OPTIONS = AUDITABLE_TYPES.map((value) => ({ value, label: humanize(value) }));

const ACTOR_TYPE_OPTIONS = ACTOR_TYPES.map((value) => ({ value, label: humanize(value) }));

export async function AuditLogsList({
  event,
  auditableType,
  auditableId,
  userType,
  userId,
  from,
  to,
  page,
}: {
  event: string;
  auditableType: string;
  // Exact-match ids, free text. Combine with the matching type for "every
  // change to this record" / "everything this actor did".
  auditableId: string;
  userType: string;
  userId: string;
  from: string;
  to: string;
  page: string;
}) {
  await requireAdminSession();

  const query = buildAdminLogQuery({
    filters: {
      event,
      auditable_type: auditableType,
      auditable_id: auditableId,
      user_type: userType,
      user_id: userId,
    },
    from,
    to,
    page,
  });

  let response: Paginated<AuditLogListItem>;
  try {
    response = await apiFetch<Paginated<AuditLogListItem>>(
      `/audit-logs?${query}`,
      { cache: "no-store" },
      "admin",
    );
  } catch (err) {
    return <AdminLogsError error={err} label="audit logs" permission="audit-logs-view" />;
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
    <section aria-label="Audit logs" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <LogDateRangeFilter from={from} to={to} />
        <LogFilterSelect
          param="event"
          label="Filter by event"
          value={event}
          allLabel="All events"
          options={EVENT_OPTIONS}
        />
        <LogFilterSelect
          param="auditable_type"
          label="Filter by subject type"
          value={auditableType}
          allLabel="All subjects"
          options={TYPE_OPTIONS}
          className="sm:w-52"
        />
        <LogFilterInput
          param="auditable_id"
          label="Filter by subject id"
          value={auditableId}
          placeholder="Subject id"
          className="sm:w-32"
        />
        <LogFilterSelect
          param="user_type"
          label="Filter by actor type"
          value={userType}
          allLabel="All actors"
          options={ACTOR_TYPE_OPTIONS}
          className="sm:w-40"
        />
        <LogFilterInput
          param="user_id"
          label="Filter by actor id"
          value={userId}
          placeholder="Actor id"
          className="sm:w-32"
        />
        <ClearLogFiltersButton />
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={History}
          title="No audit entries match these filters"
          description="Widen the date range or clear the event, subject and actor filters. Ids match exactly. The range is inclusive on both ends and can span months."
        />
      ) : (
        <>
          <AuditLogTable logs={logs} />
          <PaginationBar meta={meta} />
        </>
      )}
    </section>
  );
}
