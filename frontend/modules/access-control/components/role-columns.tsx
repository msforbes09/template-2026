"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, UsersRound } from "lucide-react";
import { EditRoleModal } from "@/modules/access-control/components/edit-role-modal";
import { DeleteRoleDialog } from "@/modules/access-control/components/delete-role-dialog";
import { SyncPermissionsModal } from "@/modules/access-control/components/sync-permissions-modal";
import type { Role } from "@/types/access-control";

// Built per render so permission flags can shape the columns — the
// buildUserColumns pattern.
export function buildRoleColumns({
  canManage,
  canViewAdministrators,
}: {
  // roles-manage: the write actions; without it the Permissions button opens
  // read-only and Edit/Delete go.
  canManage: boolean;
  // administrators-view: whether the admins count may REDIRECT to the
  // administrators list filtered to the role's holders — without it the
  // count renders as a plain number, since the destination would only 403.
  canViewAdministrators: boolean;
}): ColumnDef<Role>[] {
  return [
  {
    id: "name",
    header: "Role",
    cell: ({ row }) => {
      const role = row.original;
      return (
        <div>
          <p className="font-medium text-foreground">{role.name}</p>
          {role.description && (
            <p className="text-xs text-muted-foreground">{role.description}</p>
          )}
        </div>
      );
    },
  },
  {
    id: "admins",
    header: () => <span className="block text-right">Admins</span>,
    cell: ({ row }) => {
      const role = row.original;
      const count = role.admins_count;
      if (count == null) {
        return <span className="block text-right text-sm text-muted-foreground">—</span>;
      }
      // Person icon + count: says "people" at a glance without a unit word,
      // and every row shares the same shape so the digits stay aligned. Zero
      // never links — an empty filtered list is a dead end either way — and
      // without administrators-view the destination would only 403; those
      // rows render the same pair inert, zero dimmed a step further.
      const pair = (
        <>
          <UsersRound aria-hidden className="size-3.5" />
          {count}
        </>
      );
      if (count === 0 || !canViewAdministrators) {
        return (
          <span
            className={
              "inline-flex w-full items-center justify-end gap-1.5 text-sm tabular-nums " +
              (count === 0 ? "text-muted-foreground/50" : "text-muted-foreground")
            }
          >
            {pair}
            {/* Invisible arrow keeps the digits in one column with the
                linked rows below/above. */}
            <ArrowRight aria-hidden className="invisible size-3.5" />
          </span>
        );
      }
      return (
        <span className="block text-right">
          <Link
            href={`/admin/administrators?role=${role.id}`}
            aria-label={`View the ${count} administrator${count === 1 ? "" : "s"} holding ${role.name}`}
            className="group inline-flex items-center gap-1.5 rounded-md text-sm tabular-nums text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {pair}
            <ArrowRight
              aria-hidden
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </span>
      );
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const role = row.original;
      return (
        <div className="flex items-center justify-end gap-1">
          {canManage ? (
            <>
              <EditRoleModal id={role.id} name={role.name} />
              <SyncPermissionsModal id={role.id} name={role.name} />
              <DeleteRoleDialog id={role.id} name={role.name} />
            </>
          ) : (
            <SyncPermissionsModal id={role.id} name={role.name} readOnly />
          )}
        </div>
      );
    },
  },
  ];
}
