"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { buildGatewayLogColumns } from "@/modules/gateway-logs/components/gateway-log-columns";
import type { GatewayLogAudience } from "@/modules/gateway-logs/components/view-gateway-log-modal";
import type { GatewayLogListItem } from "@/types/gateway-log";

// Client wrapper so the column set can be built from the audience — a Server
// Component can't call the column factory itself, since the cell renderers are
// functions and would have to cross the RSC boundary.
export function GatewayLogsTable({
  logs,
  audience,
  userUuid,
  platformFilterable = true,
}: {
  logs: GatewayLogListItem[];
  audience: GatewayLogAudience;
  userUuid?: string;
  platformFilterable?: boolean;
}) {
  const columns = useMemo(
    () => buildGatewayLogColumns({ audience, userUuid, platformFilterable }),
    [audience, userUuid, platformFilterable],
  );

  return <DataTable columns={columns} data={logs} />;
}
