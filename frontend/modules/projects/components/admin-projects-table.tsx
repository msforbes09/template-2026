"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { buildAdminProjectColumns } from "@/modules/projects/components/admin-project-columns";
import type { AdminProjectListItem, ProjectTag } from "@/types/project";

// Thin client wrapper so AdminProjectsList (a Server Component) can hand the
// fetched tag catalogue, the signed-in admin's id, and the permission/flag
// booleans to the column factory.
export function AdminProjectsTable({
  data,
  catalog,
  currentAdminId,
  canManage,
  statusFilter,
}: {
  data: AdminProjectListItem[];
  catalog: ProjectTag[];
  currentAdminId: number | null;
  canManage: boolean;
  statusFilter: string;
}) {
  const columns = useMemo(
    () =>
      buildAdminProjectColumns({ catalog, currentAdminId, canManage, statusFilter }),
    [catalog, currentAdminId, canManage, statusFilter],
  );
  return <DataTable columns={columns} data={data} />;
}
