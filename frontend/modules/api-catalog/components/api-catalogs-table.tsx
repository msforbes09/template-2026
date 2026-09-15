"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { buildApiCatalogColumns } from "@/modules/api-catalog/components/api-catalog-columns";
import type { ApiCatalogListItem } from "@/types/api-catalog";

// Thin client wrapper so ApiCatalogsList (a Server Component) can pass
// permission flags as plain booleans — the column definitions themselves hold
// functions and so have to be built on the client. Same pattern as UsersTable.
export function ApiCatalogsTable({
  data,
  canViewDashboard,
  canManage,
  showRating,
}: {
  data: ApiCatalogListItem[];
  canViewDashboard: boolean;
  canManage: boolean;
  showRating: boolean;
}) {
  const columns = useMemo(
    () => buildApiCatalogColumns({ canViewDashboard, canManage, showRating }),
    [canViewDashboard, canManage, showRating],
  );

  return <DataTable columns={columns} data={data} />;
}
