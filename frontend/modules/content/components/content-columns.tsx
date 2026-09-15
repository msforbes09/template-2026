"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { formatDate } from "@/lib/format-date";
import { EditContentModal } from "@/modules/content/components/edit-content-modal";
import { DeleteContentDialog } from "@/modules/content/components/delete-content-dialog";
import { ViewContentModal } from "@/modules/content/components/view-content-modal";
import type { Content } from "@/types/content";

export const contentColumns: ColumnDef<Content>[] = [
  {
    id: "identifier",
    header: "Identifier",
    cell: ({ row }) => {
      const content = row.original;
      return (
        <div>
          <p className="font-mono text-sm font-medium text-foreground">{content.identifier}</p>
          {content.meta?.title && (
            <p className="text-xs text-muted-foreground">{content.meta.title}</p>
          )}
        </div>
      );
    },
  },
  {
    id: "updated_at",
    header: "Updated",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(row.original.updated_at)}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const content = row.original;
      return (
        <div className="flex items-center justify-end gap-1">
          {/* Always offered, manage or not: the edit modal shows the body in
              an editor, while View renders it as readers get it — different
              questions. Same convention as the catalog's ViewSpecModal. */}
          <ViewContentModal id={content.id} identifier={content.identifier} />
          <EditContentModal id={content.id} identifier={content.identifier} />
          <DeleteContentDialog id={content.id} identifier={content.identifier} />
        </div>
      );
    },
  },
];

// The same table without contents-manage: View stays (it is a read), only
// Edit/Delete go.
export const contentColumnsReadOnly: ColumnDef<Content>[] = contentColumns.map((column) =>
  column.id === "actions"
    ? {
        ...column,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <ViewContentModal id={row.original.id} identifier={row.original.identifier} />
          </div>
        ),
      }
    : column,
);
