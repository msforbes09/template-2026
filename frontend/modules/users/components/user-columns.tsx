"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ChartSpline, ScrollText } from "lucide-react";
import { listDateColumn } from "@/modules/users/lib/user-list-date";
import { userStatusLabel } from "@/modules/users/lib/user-status-label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ViewUserModal } from "@/modules/users/components/view-user-modal";
import { TopUpQuotaModal } from "@/modules/users/components/top-up-quota-modal";
import type { AdminUser } from "@/types/admin-user";

// A factory rather than a constant so the row actions can be gated on the
// signed-in admin's own permissions, which only a Server Component can read.
// The flags arrive as plain booleans through UsersTable — column defs can't
// cross the RSC boundary themselves, since their cells are functions.
// Defaults fail CLOSED, matching adminCan: a caller that forgets a flag gets
// a table with the gated actions hidden, not exposed. The one caller
// (UsersTable) passes every flag explicitly.
export function buildUserColumns({
  canTopUpQuota = false,
  canViewGatewayLogs = false,
  canViewDashboard = false,
  // users-manage gates the whole lifecycle cluster (claim, approve/return,
  // sanctions, the developer grant); the claim-free reads beside it (logs,
  // dashboard, quota, view) keep their own flags.
  canManageUsers = false,
  currentAdminId = null,
  // The selected status view and type filter — together they pick which
  // single timestamp column the list shows (see listDateColumn).
  status = "",
  accountType = "",
}: {
  canTopUpQuota?: boolean;
  canViewGatewayLogs?: boolean;
  canViewDashboard?: boolean;
  canManageUsers?: boolean;
  currentAdminId?: number | null;
  status?: string;
  accountType?: string;
} = {}): ColumnDef<AdminUser>[] {
  const dateColumn = listDateColumn(status, accountType);
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
                  doesn't actually load as an image — the backend's mime_type
                  for portal users isn't reliable (often application/octet-stream
                  even for real image uploads), so gating on it here would hide
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
      id: "type",
      header: "Type",
      // The capability axis, both as badges — the developer's tinted so it
      // still stands out against the plain Basic.
      cell: ({ row }) =>
        row.original.type === "developer" ? (
          <Badge variant="secondary" className="bg-sky-500/10 text-sky-700 dark:text-sky-400">
            Developer
          </Badge>
        ) : (
          <Badge variant="secondary">Basic</Badge>
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
              <Badge
                variant="secondary"
                className={
                  user.status === "suspended" ? "bg-destructive/10 text-destructive" : undefined
                }
              >
                {userStatusLabel(user.status)}
              </Badge>
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
      // The API's own Y-m-d H:i:s string, verbatim — the one timestamp this
      // view is about (last login on All users, the queue-entry date on a
      // status view).
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {row.original[dateColumn.field] ?? dateColumn.empty}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const user = row.original;
        // Gateway logs and the dashboard drill only exist for an approved
        // account — nobody else has credentials to log.
        const isApproved = user.status === "approved";
        const navButtons = (
          <>
            {isApproved && canTopUpQuota && (
              <TopUpQuotaModal uuid={user.uuid} name={user.display_name} />
            )}
            {isApproved && canViewGatewayLogs && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`View ${user.display_name}'s gateway logs`}
                      nativeButton={false}
                      render={<Link href={`/admin/gateway-logs?user=${user.uuid}`} />}
                    >
                      <ScrollText aria-hidden className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent>Gateway logs</TooltipContent>
              </Tooltip>
            )}
            {isApproved && canViewDashboard && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`View ${user.display_name}'s usage dashboard`}
                      nativeButton={false}
                      render={<Link href={`/admin?user_uuid=${user.uuid}`} />}
                    >
                      <ChartSpline aria-hidden className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent>Usage dashboard</TooltipContent>
              </Tooltip>
            )}
          </>
        );
        return (
          <div className="flex items-center justify-end gap-1">
            {/* Both permission shapes read the same order: view first, then
                top-up, then the navigations. users-manage rows prefix the
                claim icon and a pipe ([claim] | eye · coins · logs · chart),
                all around one modal — Start assessment claims then opens, the
                filled-Pin states and the eye just open. */}
            {canManageUsers ? (
              <ViewUserModal
                user={user}
                canManageUsers={canManageUsers}
                currentAdminId={currentAdminId}
                triggerMode="claim-state"
                nav={navButtons}
              />
            ) : (
              <>
                <ViewUserModal
                  user={user}
                  canManageUsers={canManageUsers}
                  currentAdminId={currentAdminId}
                />
                {navButtons}
              </>
            )}
          </div>
        );
      },
    },
  ];
}
