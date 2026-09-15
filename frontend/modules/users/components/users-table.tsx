"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { buildUserColumns } from "@/modules/users/components/user-columns";
import type { AdminUser } from "@/types/admin-user";

// Thin client wrapper so UsersList (a Server Component) can pass permission
// flags as plain booleans — the column definitions themselves hold functions
// and so have to be built on the client.
export function UsersTable({
  data,
  canTopUpQuota,
  canViewGatewayLogs,
  canViewDashboard,
  canManageUsers,
  currentAdminId,
  status,
  accountType,
}: {
  data: AdminUser[];
  canTopUpQuota: boolean;
  canViewGatewayLogs: boolean;
  canViewDashboard: boolean;
  canManageUsers: boolean;
  currentAdminId: number | null;
  status: string;
  accountType: string;
}) {
  const columns = useMemo(
    () =>
      buildUserColumns({
        canTopUpQuota,
        canViewGatewayLogs,
        canViewDashboard,
        canManageUsers,
        currentAdminId,
        status,
        accountType,
      }),
    [canTopUpQuota, canViewGatewayLogs, canViewDashboard, canManageUsers, currentAdminId, status, accountType],
  );

  return <DataTable columns={columns} data={data} />;
}
