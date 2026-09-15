"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import {
  DetailField,
  DetailGrid,
  ExceptionNotice,
  JsonSection,
} from "@/components/ui/detail-list";
import { MethodBadge } from "@/modules/admin-logs/components/method-badge";
import { HttpStatusBadge } from "@/modules/admin-logs/components/http-status-badge";
import { ViewLogModal } from "@/modules/admin-logs/components/view-log-modal";
import { ModelRefBadge } from "@/modules/admin-logs/components/model-ref-badge";
import { getConnectionLog } from "@/modules/admin-logs/actions/admin-log-actions";
import { formatLogTimestamp } from "@/lib/log-date";
import { formatNumber } from "@/lib/format-number";
import { truncateMiddle } from "@/lib/truncate-middle";
import type { ConnectionLogDetail, ConnectionLogListItem } from "@/types/operational-log";

// Outbound calls WE make to partners — the mirror image of a gateway log,
// which records calls citizens make to us. The url here is a full partner URL
// including host, not a path.

function ConnectionLogDetailBody({ log }: { log: ConnectionLogDetail }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <MethodBadge method={log.method} />
        <HttpStatusBadge statusCode={log.status_code} />
        <span className="text-xs text-muted-foreground">{log.type}</span>
      </div>

      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs break-all">
        {log.url}
      </p>

      <DetailGrid>
        <DetailField label="Requested At">{formatLogTimestamp(log.requested_at)}</DetailField>
        <DetailField label="Duration">
          {log.duration_ms == null ? "—" : `${formatNumber(log.duration_ms)} ms`}
        </DetailField>
        <DetailField label="Reference">{log.reference ?? "—"}</DetailField>
        <DetailField label="IP Address">{log.ip_address ?? "—"}</DetailField>
        {/* A raw morph pair rather than a resolved caller — this endpoint
            doesn't join the user in the way the gateway show does. */}
        <DetailField label="Triggered By">
          <ModelRefBadge type={log.user_type} id={log.user_id} fallback="—" />
        </DetailField>
      </DetailGrid>

      <ExceptionNotice exception={log.exception} />

      <div className="flex flex-col gap-3">
        <JsonSection label="Request Headers" blob={log.headers} />
        <JsonSection label="Query Parameters" blob={log.params} />
        <JsonSection label="Request Payload" blob={log.payload} />
        <JsonSection label="Response" blob={log.response} />
      </div>

      <p className="text-xs text-muted-foreground">
        Sensitive values in the payload, response and headers are masked before
        they are stored.
      </p>
    </div>
  );
}

function buildColumns(): ColumnDef<ConnectionLogListItem>[] {
  return [
    {
      id: "requested_at",
      header: "When",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatLogTimestamp(row.original.requested_at)}
        </span>
      ),
    },
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-sm font-medium text-foreground">{row.original.type}</span>
      ),
    },
    {
      id: "reference",
      header: "Reference",
      cell: ({ row }) => (
        <span
          className="block max-w-40 truncate font-mono text-xs text-muted-foreground"
          title={row.original.reference ?? undefined}
        >
          {row.original.reference ?? "—"}
        </span>
      ),
    },
    {
      id: "request",
      header: "Request",
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-2">
          <MethodBadge method={row.original.method} className="px-1.5 text-[11px]" />
          <span className="truncate font-mono text-xs text-muted-foreground" title={row.original.url}>
            {truncateMiddle(row.original.url)}
          </span>
        </div>
      ),
    },
    {
      id: "status_code",
      header: "Status",
      cell: ({ row }) => <HttpStatusBadge statusCode={row.original.status_code} />,
    },
    {
      id: "duration_ms",
      header: "Duration",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {row.original.duration_ms == null ? "—" : `${formatNumber(row.original.duration_ms)} ms`}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ViewLogModal<ConnectionLogDetail>
            title="Connection Details"
            description={formatLogTimestamp(row.original.requested_at)}
            triggerLabel={`View ${row.original.method} ${row.original.url} connection details`}
            load={() => getConnectionLog(row.original.id)}
            renderBody={(log) => <ConnectionLogDetailBody log={log} />}
          />
        </div>
      ),
    },
  ];
}

// Client wrapper so the column set can be built here — cell renderers are
// functions and can't cross the RSC boundary, so a Server Component can't call
// the factory itself.
export function ConnectionLogTable({ logs }: { logs: ConnectionLogListItem[] }) {
  const columns = useMemo(() => buildColumns(), []);
  return <DataTable columns={columns} data={logs} />;
}
