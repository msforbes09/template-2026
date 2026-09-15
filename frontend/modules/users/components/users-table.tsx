"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { buildUserColumns } from "@/modules/users/components/user-columns";
import type { AdminUser } from "@/types/admin-user";

// Thin client wrapper so UsersList (a Server Component) can pass the selected
// status view as a plain string — the column definitions themselves hold
// functions and so have to be built on the client.
export function UsersTable({ data, status }: { data: AdminUser[]; status: string }) {
  const columns = useMemo(() => buildUserColumns({ status }), [status]);
  return <DataTable columns={columns} data={data} />;
}
