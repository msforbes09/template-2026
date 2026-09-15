"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { formatDate } from "@/lib/format-date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EditAdministratorModal } from "@/modules/administrators/components/edit-administrator-modal";
import { DeleteAdministratorDialog } from "@/modules/administrators/components/delete-administrator-dialog";
import { ResetPasswordDialog } from "@/modules/administrators/components/reset-password-dialog";
import { SyncRolesModal } from "@/modules/administrators/components/sync-roles-modal";
import { ToggleActiveSwitch } from "@/modules/administrators/components/toggle-active-switch";
import type { Administrator } from "@/types/administrator";

export const administratorColumns: ColumnDef<Administrator>[] = [
  {
    id: "name",
    header: "Administrator",
    cell: ({ row }) => {
      const admin = row.original;
      const name = `${admin.first_name} ${admin.last_name}`;
      const isImage = admin.photo?.mime_type.startsWith("image/") ?? false;
      return (
        <div className="flex items-center gap-3">
          <Avatar>
            {isImage && admin.photo && <AvatarImage src={admin.photo.url} alt={name} />}
            <AvatarFallback aria-hidden>{admin.first_name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground">{admin.email}</p>
          </div>
        </div>
      );
    },
  },
  {
    id: "active",
    header: "Active",
    cell: ({ row }) => {
      const admin = row.original;
      return (
        <ToggleActiveSwitch
          id={admin.id}
          active={admin.is_active === 1}
          name={`${admin.first_name} ${admin.last_name}`}
        />
      );
    },
  },
  {
    id: "last_login_at",
    // The roster's ONE timestamp (2026-09-02): created/updated/auth-validated
    // and the temp-password flag all left — recency of use is the operational
    // question, and the rest still arrives in the payload unshown. Y-m-d
    // H:i:s to match the API's own format everywhere else.
    header: "Last login",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-muted-foreground">
        {formatDate(row.original.last_login_at, "yyyy-MM-dd HH:mm:ss", "—")}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const admin = row.original;
      const name = `${admin.first_name} ${admin.last_name}`;
      return (
        <div className="flex items-center justify-end gap-1">
          <EditAdministratorModal id={admin.id} name={name} />
          <SyncRolesModal id={admin.id} name={name} />
          <ResetPasswordDialog id={admin.id} name={name} />
          <DeleteAdministratorDialog id={admin.id} name={name} />
        </div>
      );
    },
  },
];

// The same table without administrators-manage: the SAME Roles button stays
// but opens read-only (the modal is the one place roles are visible now that
// the column is gone), the other write actions go, and the live
// active/inactive switch becomes a plain badge — a control that could only
// 403 must not look operable.
export const administratorColumnsReadOnly: ColumnDef<Administrator>[] = administratorColumns
  .map((column) =>
    column.id === "actions"
      ? {
          ...column,
          cell: ({ row }: { row: { original: Administrator } }) => (
            <div className="flex items-center justify-end gap-1">
              <SyncRolesModal
                id={row.original.id}
                name={`${row.original.first_name} ${row.original.last_name}`}
                readOnly
              />
            </div>
          ),
        }
      : column,
  )
  .map((column) =>
    column.id === "active"
      ? {
          ...column,
          cell: ({ row }) =>
            row.original.is_active === 1 ? (
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              >
                Active
              </Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            ),
        }
      : column,
  );
