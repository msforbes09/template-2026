"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { DetailField, DetailGrid } from "@/components/ui/detail-list";
import { ViewLogModal } from "@/modules/admin-logs/components/view-log-modal";
import { ModelRefBadge } from "@/modules/admin-logs/components/model-ref-badge";
import { getAuthAttemptLog } from "@/modules/admin-logs/actions/admin-log-actions";
import { formatLogTimestamp } from "@/lib/log-date";
import type { AuthAttemptLogDetail, AuthAttemptLogListItem } from "@/types/operational-log";

// Sign-in successes and failures across both guards. The identifier someone
// typed is never returned in full — only a masked form, and only for the
// administrators guard — so there's deliberately no way to read back the email
// or mobile a failed attempt used.

// Events that mean the attempt failed. Open-ended server-side, so anything
// unrecognised is treated as neutral rather than mislabelled as a success.
const FAILURE_EVENTS = new Set([
  "invalid_credentials",
  "failed",
  "locked",
  "throttled",
  "invalid_otp",
  "invalid_two_factor",
]);

function EventBadge({ event }: { event: string }) {
  const failed = FAILURE_EVENTS.has(event);
  return (
    <Badge variant={failed ? "destructive" : "secondary"} className="font-mono text-[11px]">
      {event}
    </Badge>
  );
}

function AuthAttemptLogDetailBody({ log }: { log: AuthAttemptLogDetail }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <EventBadge event={log.event} />
        <span className="text-xs text-muted-foreground">{log.guard}</span>
      </div>

      <DetailGrid>
        <DetailField label="Attempted At">{formatLogTimestamp(log.attempted_at)}</DetailField>
        <DetailField label="IP Address">{log.ip_address ?? "—"}</DetailField>
        {/* Only ever present for the administrators guard, and masked even
            then — a citizen attempt shows nothing here by design. */}
        <DetailField label="Identifier (masked)">{log.identifier ?? "—"}</DetailField>
        <DetailField label="Account">
          <ModelRefBadge type={log.user_type} id={log.user_id} fallback="Not resolved" />
        </DetailField>
        <DetailField label="User Agent" span>
          {log.user_agent ? (
            <span className="font-mono text-xs break-all">{log.user_agent}</span>
          ) : (
            "—"
          )}
        </DetailField>
      </DetailGrid>

      <p className="text-xs text-muted-foreground">
        The identifier entered is never stored in full. The hash lets repeated
        attempts be correlated without revealing the address or number used.
      </p>
    </div>
  );
}

function buildColumns(): ColumnDef<AuthAttemptLogListItem>[] {
  return [
    {
      id: "attempted_at",
      header: "When",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatLogTimestamp(row.original.attempted_at)}
        </span>
      ),
    },
    {
      id: "guard",
      header: "Guard",
      cell: ({ row }) => (
        <span className="text-sm font-medium text-foreground">{row.original.guard}</span>
      ),
    },
    {
      id: "event",
      header: "Event",
      cell: ({ row }) => <EventBadge event={row.original.event} />,
    },
    {
      id: "account",
      header: "Account",
      cell: ({ row }) => (
        <ModelRefBadge
          type={row.original.user_type}
          id={row.original.user_id}
          fallback="—"
          filter={{
            user_type: row.original.user_type,
            user_id: row.original.user_id == null ? null : String(row.original.user_id),
          }}
        />
      ),
    },
    {
      id: "ip_address",
      header: "IP Address",
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
          {row.original.ip_address ?? "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ViewLogModal<AuthAttemptLogDetail>
            title="Sign-in attempt"
            description={formatLogTimestamp(row.original.attempted_at)}
            triggerLabel={`View ${row.original.event} attempt on the ${row.original.guard} guard`}
            load={() => getAuthAttemptLog(row.original.id)}
            renderBody={(log) => <AuthAttemptLogDetailBody log={log} />}
          />
        </div>
      ),
    },
  ];
}

export function AuthAttemptLogTable({ logs }: { logs: AuthAttemptLogListItem[] }) {
  const columns = useMemo(() => buildColumns(), []);
  return <DataTable columns={columns} data={logs} />;
}
