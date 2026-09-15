"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { DetailField, DetailGrid, JsonSection, hasContent } from "@/components/ui/detail-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ViewLogModal } from "@/modules/admin-logs/components/view-log-modal";
import { ModelRefBadge } from "@/modules/admin-logs/components/model-ref-badge";
import { getAuditLog } from "@/modules/admin-logs/actions/admin-log-actions";
import { formatLogTimestamp } from "@/lib/log-date";
import type { AuditLogDetail, AuditLogListItem, LogBlob } from "@/types/operational-log";

// The change trail. Includes gateway credential mint/revoke as of the
// 2026-08-15 release (auditable_type "GatewayCredential", event created /
// deleted), with the secret material excluded server-side.

function EventBadge({ event }: { event: string }) {
  // deleted is the destructive one; created and updated are routine.
  const variant = event === "deleted" ? "destructive" : event === "created" ? "default" : "secondary";
  return (
    <Badge variant={variant} className="font-mono text-[11px]">
      {event}
    </Badge>
  );
}

// Renders a value as it appeared in the audit blob. Objects/arrays are nested
// JSON, so they're stringified rather than coerced to "[object Object]".
function valueText(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// A field-by-field before/after table, which is what an audit entry is
// actually for — the raw old_values/new_values blobs are also available below,
// but reading a diff out of two JSON dumps side by side is miserable.
function ChangeSet({ oldValues, newValues }: { oldValues: LogBlob; newValues: LogBlob }) {
  const before = (oldValues && !Array.isArray(oldValues) ? oldValues : {}) as Record<string, unknown>;
  const after = (newValues && !Array.isArray(newValues) ? newValues : {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();

  if (keys.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No field-level changes to compare — see the JSON tab for the raw payload.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <caption className="sr-only">Field changes recorded by this audit entry</caption>
        <thead>
          <tr className="bg-muted/60 text-left">
            <th scope="col" className="px-3 py-2 text-xs font-medium text-muted-foreground">
              Field
            </th>
            <th scope="col" className="px-3 py-2 text-xs font-medium text-muted-foreground">
              Before
            </th>
            <th scope="col" className="px-3 py-2 text-xs font-medium text-muted-foreground">
              After
            </th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key} className="border-t border-border align-top">
              <th scope="row" className="px-3 py-2 text-left font-mono text-xs font-medium">
                {key}
              </th>
              <td className="px-3 py-2 font-mono text-xs break-words text-muted-foreground">
                {valueText(before[key])}
              </td>
              <td className="px-3 py-2 font-mono text-xs break-words text-foreground">
                {valueText(after[key])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditLogDetailBody({ log }: { log: AuditLogDetail }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <EventBadge event={log.event} />
        <ModelRefBadge type={log.auditable_type} id={log.auditable_id} fallback="—" />
      </div>

      <DetailGrid>
        <DetailField label="Recorded At">{formatLogTimestamp(log.created_at)}</DetailField>
        <DetailField label="IP Address">{log.ip_address ?? "—"}</DetailField>
        <DetailField label="Actor">
          <ModelRefBadge type={log.user_type} id={log.user_id} fallback="—" />
        </DetailField>
        <DetailField label="Request URL" span>
          {log.url ? <span className="font-mono text-xs break-all">{log.url}</span> : "—"}
        </DetailField>
        <DetailField label="User Agent" span>
          {log.user_agent ? (
            <span className="font-mono text-xs break-all">{log.user_agent}</span>
          ) : (
            "—"
          )}
        </DetailField>
      </DetailGrid>

      {/* Field-by-field comparison first — that's what an audit entry is for.
          The raw blobs sit behind a second tab for anything the table flattens
          away (nested objects render as one-line JSON in the comparison). */}
      {(hasContent(log.old_values) || hasContent(log.new_values)) && (
        <Tabs defaultValue="comparison" className="gap-3">
          <TabsList aria-label="Change Details">
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>
          <TabsContent value="comparison">
            <ChangeSet oldValues={log.old_values} newValues={log.new_values} />
          </TabsContent>
          <TabsContent value="json" className="flex flex-col gap-3">
            <JsonSection label="Old Values" blob={log.old_values} />
            <JsonSection label="New Values" blob={log.new_values} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function buildColumns(): ColumnDef<AuditLogListItem>[] {
  return [
    {
      id: "created_at",
      header: "When",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatLogTimestamp(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "event",
      header: "Event",
      cell: ({ row }) => <EventBadge event={row.original.event} />,
    },
    {
      id: "auditable",
      header: "Subject",
      cell: ({ row }) => (
        <ModelRefBadge
          type={row.original.auditable_type}
          id={row.original.auditable_id}
          fallback="—"
          filter={{
            auditable_type: row.original.auditable_type,
            auditable_id: row.original.auditable_id,
          }}
        />
      ),
    },
    {
      id: "actor",
      header: "Actor",
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
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ViewLogModal<AuditLogDetail>
            title="Audit Entry"
            description={formatLogTimestamp(row.original.created_at)}
            triggerLabel={`View ${row.original.event} audit entry for ${row.original.auditable_type ?? "record"}`}
            load={() => getAuditLog(row.original.id)}
            renderBody={(log) => <AuditLogDetailBody log={log} />}
          />
        </div>
      ),
    },
  ];
}

export function AuditLogTable({ logs }: { logs: AuditLogListItem[] }) {
  const columns = useMemo(() => buildColumns(), []);
  return <DataTable columns={columns} data={logs} />;
}
