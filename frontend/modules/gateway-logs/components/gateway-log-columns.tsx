"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MethodBadge } from "@/modules/api-docs/components/method-badge";
import { PlatformBadge } from "@/modules/gateway-logs/components/platform-badge";
import { GatewayStatusBadge } from "@/modules/gateway-logs/components/gateway-status-badge";
import {
  ViewGatewayLogModal,
  type GatewayLogAudience,
} from "@/modules/gateway-logs/components/view-gateway-log-modal";
import { formatLogTimestamp } from "@/lib/log-date";
import { formatNumber } from "@/lib/format-number";
import { truncateMiddle } from "@/lib/truncate-middle";
import type { GatewayLogListItem } from "@/types/gateway-log";

// A factory rather than a constant: every row's detail lookup needs the
// audience whose show endpoint to call, and optionally the citizen it's
// scoped to. The month used to travel here too; the composite row id carries
// it now.
export function buildGatewayLogColumns({
  audience,
  userUuid,
  platformFilterable = true,
}: {
  audience: GatewayLogAudience;
  userUuid?: string;
  // Off where the platform is pinned (per-catalog tab) — see PlatformBadge.
  platformFilterable?: boolean;
}): ColumnDef<GatewayLogListItem>[] {
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
      id: "platform",
      header: "Platform",
      cell: ({ row }) => (
        <PlatformBadge platform={row.original.platform} filterable={platformFilterable} />
      ),
    },
    {
      id: "request",
      header: "Request",
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-2">
          <MethodBadge method={row.original.method} className="px-1.5 text-[11px]" />
          <span
            className="truncate font-mono text-xs text-muted-foreground"
            title={row.original.url}
          >
            {truncateMiddle(row.original.url)}
          </span>
        </div>
      ),
    },
    {
      id: "status_code",
      header: "Status",
      cell: ({ row }) => <GatewayStatusBadge statusCode={row.original.status_code} />,
    },
    {
      id: "gateway_duration_ms",
      header: "Duration",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {row.original.gateway_duration_ms == null
            ? "—"
            : `${formatNumber(row.original.gateway_duration_ms)} ms`}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ViewGatewayLogModal log={row.original} audience={audience} userUuid={userUuid} />
        </div>
      ),
    },
  ];
}
