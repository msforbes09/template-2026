import { AlertTriangle, Lock } from "lucide-react";
import { isApiError } from "@/lib/api-error";
import { EmptyState } from "@/components/ui/empty-state";

// The failure states every admin log list shares. Lists catch their own fetch
// errors and render one of these inline rather than throwing — a
// Suspense-wrapped Server Component's throw doesn't reliably reach the nearest
// error boundary in this app.
export function AdminLogsError({
  error,
  label,
  permission,
}: {
  error: unknown;
  // Human name of the log type, for the copy ("audit logs").
  label: string;
  // The backend permission this viewer needs, named in the 403 copy so the
  // admin can ask for the right thing.
  permission: string;
}) {
  // The API is the real boundary: an admin whose role lacks the permission
  // gets a 403 here even if the nav item rendered (adminCan fails open when
  // the profile's permissions list is absent entirely).
  if (isApiError(error) && error.status === 403) {
    return (
      <EmptyState
        icon={Lock}
        title={`You don't have access to ${label}`}
        description={`Ask an administrator to grant your role the ${permission} permission, then sign in again — token abilities are snapshotted at login.`}
      />
    );
  }
  return (
    <EmptyState
      icon={AlertTriangle}
      title={`Couldn't load ${label}`}
      description={isApiError(error) ? error.message : `Something went wrong loading ${label}.`}
    />
  );
}

// Mirrors the real list: a date-range button, `filters` term selects, a table
// header plus rows, and the paginator row.
export function AdminLogsSkeleton({ rows = 8, filters = 1 }: { rows?: number; filters?: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="h-8 w-full animate-pulse rounded-lg bg-muted sm:w-64" />
        {Array.from({ length: filters }).map((_, i) => (
          <div key={i} className="h-8 w-full animate-pulse rounded-lg bg-muted sm:w-44" />
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="h-10 w-full animate-pulse bg-muted/60" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-14 w-full animate-pulse border-t border-border bg-muted/30" />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-28 animate-pulse rounded bg-muted/70" />
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
