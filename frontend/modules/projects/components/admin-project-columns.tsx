"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ImageOff, UserCog, UserRound } from "lucide-react";
import { ProjectRowActions } from "@/modules/projects/components/project-row-actions";
import { ProjectStatusBadge } from "@/modules/projects/components/project-status-badge";
import { ProjectTagChips } from "@/modules/projects/components/project-tag-chips";
import { listTimestampColumn } from "@/modules/projects/lib/project-status";
import type { AdminProjectListItem, ProjectTag } from "@/types/project";

// A factory, like buildUserColumns: the tag catalogue is fetched server-side
// and passed through AdminProjectsTable as plain data, because column defs
// hold functions and can't cross the RSC boundary themselves.
export function buildAdminProjectColumns({
  catalog,
  currentAdminId,
  canManage,
  statusFilter,
}: {
  catalog: ProjectTag[];
  // Which claim is "yours" in the actions pin; null (an unresolvable
  // profile) renders every claim as another admin's.
  currentAdminId: number | null;
  // projects-manage — without it the claim pin isn't offered (the API would
  // answer 403 anyway; the row just doesn't render a control that can't work).
  canManage: boolean;
  // The submenu's ?status= value; drives the single adaptive timestamp
  // column (Published shows published_at, everything else updated_at).
  statusFilter: string;
}): ColumnDef<AdminProjectListItem>[] {
  const timestamp = listTimestampColumn(statusFilter);

  return [
    {
      id: "project",
      header: "Project",
      cell: ({ row }) => {
        const project = row.original;
        return (
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/60">
              {project.photo?.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed CDN URL, not configured for next/image
                <img src={project.photo.url} alt="" className="size-full object-cover" />
              ) : (
                <ImageOff aria-hidden className="size-4 text-muted-foreground/50" />
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <Link
                href={`/admin/projects/${project.uuid}`}
                className="block font-medium leading-snug hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {project.name}
              </Link>
              {project.tagline && (
                <p className="line-clamp-1 max-w-sm text-xs text-muted-foreground">
                  {project.tagline}
                </p>
              )}
              <ProjectTagChips tags={project.tags} catalog={catalog} size="sm" limit={2} />
            </div>
          </div>
        );
      },
    },
    {
      id: "owner",
      header: "Owner",
      cell: ({ row }) => {
        const owner = row.original.user;
        return owner ? (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <UserRound aria-hidden className="size-3.5 text-muted-foreground" />
            {owner.display_name}
          </span>
        ) : (
          // Null owner is the API's marker for an admin-created entry — same
          // layout as the citizen row, the cog marking the console side.
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <UserCog aria-hidden className="size-3.5" />
            Administrator
          </span>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      // The badge already reads the (status, is_published) PAIR, which is what
      // keeps an approved-but-hidden project from reading as "Live" now that
      // toggle-publish moves is_published alone.
      cell: ({ row }) => (
        <ProjectStatusBadge
          status={row.original.status}
          isPublished={row.original.is_published}
        />
      ),
    },
    {
      id: "timestamp",
      header: timestamp.header,
      // The API's raw Y-m-d H:i:s, per the console-wide timestamp rule.
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
          {row.original[timestamp.field] ?? "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <ProjectRowActions
          project={row.original}
          currentAdminId={currentAdminId}
          canManage={canManage}
        />
      ),
    },
  ];
}
