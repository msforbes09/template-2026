"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ChartSpline } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format-date";
import { EditApiCatalogModal } from "@/modules/api-catalog/components/edit-api-catalog-modal";
import { ToggleActiveSwitch } from "@/modules/api-catalog/components/toggle-active-switch";
import { ViewSpecModal } from "@/modules/api-catalog/components/view-spec-modal";
import { AdminCatalogReviewsModal } from "@/modules/api-catalog/components/admin-catalog-reviews-modal";
import { RatingSummary } from "@/modules/reviews/components/star-rating";
import type { ApiCatalogListItem } from "@/types/api-catalog";

// Built per render so permission flags can shape the action set — same
// pattern as buildUserColumns.
export const buildApiCatalogColumns = ({
  canViewDashboard,
  canManage,
  showRating,
}: {
  canViewDashboard: boolean;
  // Without api-catalogs-manage the active switch renders as a plain badge
  // and the edit action becomes a read-only view of the same fields — a
  // control that could only 403 must not look operable, but the entry's
  // description/Body/Meta live nowhere else. The spec/reviews modals stay:
  // they are reads.
  canManage: boolean;
  // The api_catalog_reviews feature flag: with reviews off, ratings are
  // frozen and the column is noise, so it isn't rendered at all.
  showRating: boolean;
}): ColumnDef<ApiCatalogListItem>[] => [
  {
    id: "name",
    header: "API",
    cell: ({ row }) => {
      const catalog = row.original;
      return (
        <div>
          <p className="font-medium text-foreground">{catalog.name ?? catalog.identifier}</p>
          <p className="font-mono text-xs text-muted-foreground">{catalog.identifier}</p>
        </div>
      );
    },
  },
  {
    id: "description",
    header: "Description",
    cell: ({ row }) => (
      <p className="max-w-md truncate text-sm text-muted-foreground">
        {row.original.description ?? "—"}
      </p>
    ),
  },
  {
    id: "active",
    header: "Active",
    cell: ({ row }) => {
      const catalog = row.original;
      if (!canManage) {
        return catalog.is_active === 1 ? (
          <Badge
            variant="secondary"
            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          >
            Active
          </Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        );
      }
      return (
        <ToggleActiveSwitch
          id={catalog.id}
          active={catalog.is_active === 1}
          name={catalog.name ?? catalog.identifier}
        />
      );
    },
  },
  ...(showRating
    ? ([
        {
          id: "rating",
          header: "Rating",
          cell: ({ row }) => (
            // Reads "no ratings" rather than a zero-star row when nothing has
            // been reviewed — rating_count is the field that decides that,
            // since rating_avg is 0 in both cases.
            <RatingSummary subject={row.original} size="sm" emptyLabel="—" />
          ),
        },
      ] satisfies ColumnDef<ApiCatalogListItem>[])
    : []),
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
      const catalog = row.original;
      return (
        <div className="flex items-center justify-end gap-1">
          {/* The catalog identifier IS the gateway platform slug, so this is
              the usage dashboard filtered to this API — the same action the
              users list offers per developer. */}
          {canViewDashboard && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`View ${catalog.name ?? catalog.identifier}'s usage dashboard`}
              nativeButton={false}
              render={<Link href={`/admin?platform=${encodeURIComponent(catalog.identifier)}`} />}
            >
              <ChartSpline aria-hidden className="size-4" />
            </Button>
          )}
          <ViewSpecModal id={catalog.id} identifier={catalog.identifier} />
          <AdminCatalogReviewsModal id={catalog.id} identifier={catalog.identifier} />
          {canManage ? (
            <EditApiCatalogModal id={catalog.id} identifier={catalog.identifier} />
          ) : (
            <EditApiCatalogModal id={catalog.id} identifier={catalog.identifier} readOnly />
          )}
        </div>
      );
    },
  },
];
