"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { listDateColumn } from "@/modules/users/lib/user-list-date";
import { userStatusLabel } from "@/modules/users/lib/user-status-label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ViewUserModal } from "@/modules/users/components/view-user-modal";
import type { AdminUser } from "@/types/admin-user";

// A factory rather than a constant: the selected status view picks which
// single timestamp column the list shows (see listDateColumn).
export function buildUserColumns({ status = "" }: { status?: string } = {}): ColumnDef<AdminUser>[] {
  const dateColumn = listDateColumn(status);
  return [
    {
      id: "name",
      header: "User",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar>
              {/* Avatar falls back to the initials on its own if the URL
                  doesn't load as an image — the backend's mime_type for
                  user photos isn't reliable, so gating on it here would hide
                  photos that do load fine. */}
              {user.photo?.url && <AvatarImage src={user.photo.url} alt={user.display_name} />}
              <AvatarFallback aria-hidden>{user.display_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{user.display_name}</p>
              {/* One contact line: the email, or the (masked) mobile for an
                  SMS-channel account with no email. */}
              <p className="text-xs text-muted-foreground">
                {user.email ?? user.mobile_number ?? "—"}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "company_name",
      header: "Company",
      cell: ({ row }) =>
        row.original.company_name ? (
          <span className="text-sm text-foreground">{row.original.company_name}</span>
        ) : (
          <span className="text-sm text-muted-foreground/50">—</span>
        ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {user.status ? (
              <Badge variant="secondary">{userStatusLabel(user.status)}</Badge>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
            {/* Exception-based: nearly every account is active, so only the
                odd one out gets a chip. */}
            {user.is_active === 0 && (
              <Badge variant="secondary" className="text-muted-foreground">
                Inactive
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: dateColumn.field,
      header: dateColumn.header,
      // The API's own Y-m-d H:i:s string, verbatim.
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {row.original[dateColumn.field] ?? dateColumn.empty}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <ViewUserModal user={row.original} />
        </div>
      ),
    },
  ];
}
