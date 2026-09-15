import { ShieldAlert } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { requireAdminSession } from "@/lib/auth/dal";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { AdminLogsError } from "@/modules/admin-logs/components/admin-logs-states";
import { AuthAttemptLogTable } from "@/modules/admin-logs/components/auth-attempt-log-table";
import { LogDateRangeFilter } from "@/components/ui/log-date-range-filter";
import { ClearLogFiltersButton } from "@/components/ui/clear-log-filters-button";
import { LogFilterInput } from "@/modules/admin-logs/components/log-filter-input";
import { LogFilterSelect } from "@/modules/admin-logs/components/log-filter-select";
import { ACTOR_TYPES } from "@/modules/admin-logs/lib/audit-options";
import { humanize } from "@/lib/humanize";
import {
  ADMIN_LOGS_PER_PAGE,
  buildAdminLogQuery,
} from "@/modules/admin-logs/lib/build-admin-log-query";
import type { AuthAttemptLogListItem } from "@/types/operational-log";
import type { Paginated } from "@/types/pagination";

const ACTOR_TYPE_OPTIONS = ACTOR_TYPES.map((value) => ({ value, label: humanize(value) }));

export async function AuthAttemptLogsList({
  event,
  userType,
  userId,
  identifier,
  from,
  to,
  page,
}: {
  event: string;
  // The email / mobile as the person typed it at sign-in. Sent in plaintext;
  // the WS hashes it with the PII key and matches identifier_hash exactly
  // (case/whitespace-insensitive), so the raw value never reaches the query.
  identifier: string;
  // The resolved account, when the attempt matched one. Exact match; id is
  // free text.
  userType: string;
  userId: string;
  from: string;
  to: string;
  page: string;
}) {
  await requireAdminSession();

  const query = buildAdminLogQuery({
    filters: { event, user_type: userType, user_id: userId, identifier },
    from,
    to,
    page,
  });

  let response: Paginated<AuthAttemptLogListItem>;
  try {
    response = await apiFetch<Paginated<AuthAttemptLogListItem>>(
      `/auth-attempt-logs?${query}`,
      { cache: "no-store" },
      "admin",
    );
  } catch (err) {
    return <AdminLogsError error={err} label="auth attempt logs" permission="auth-logs-view" />;
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

  // Derived from the rows on screen — the event vocabulary is open-ended
  // server-side, so there's no fixed list to offer. An event filtered on but
  // absent from this page still survives (LogFilterSelect re-adds it).
  const eventOptions = [...new Set(logs.map((log) => log.event))]
    .sort()
    .map((value) => ({ value, label: value }));

  return (
    <section aria-label="Auth attempt logs" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <LogDateRangeFilter from={from} to={to} />
        <LogFilterSelect
          param="event"
          label="Filter by event"
          value={event}
          allLabel="All events"
          options={eventOptions}
          className="sm:w-52"
        />
        <LogFilterSelect
          param="user_type"
          label="Filter by account type"
          value={userType}
          allLabel="All accounts"
          options={ACTOR_TYPE_OPTIONS}
          className="sm:w-40"
        />
        <LogFilterInput
          param="user_id"
          label="Filter by account id"
          value={userId}
          placeholder="Account id"
          className="sm:w-32"
        />
        <LogFilterInput
          param="identifier"
          label="Filter by identifier"
          value={identifier}
          placeholder="Email or mobile"
          className="sm:w-56"
        />
        <ClearLogFiltersButton />
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No sign-in attempts match these filters"
          description="Widen the date range or clear the event, account and identifier filters. Ids match exactly; the identifier must be the full email or mobile. The range is inclusive on both ends and can span months."
        />
      ) : (
        <>
          <AuthAttemptLogTable logs={logs} />
          <PaginationBar meta={meta} />
        </>
      )}
    </section>
  );
}
