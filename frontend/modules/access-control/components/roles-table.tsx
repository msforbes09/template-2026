"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { buildRoleColumns } from "@/modules/access-control/components/role-columns";
import type { Role } from "@/types/access-control";

// Thin client wrapper so RolesList (a Server Component) can pass permission
// flags as plain booleans — the column definitions hold functions and have to
// be built on the client. Same pattern as UsersTable / ApiCatalogsTable.
export function RolesTable({
  data,
  canManage,
  canViewAdministrators,
}: {
  data: Role[];
  canManage: boolean;
  canViewAdministrators: boolean;
}) {
  const columns = useMemo(
    () => buildRoleColumns({ canManage, canViewAdministrators }),
    [canManage, canViewAdministrators],
  );

  return <DataTable columns={columns} data={data} />;
}
