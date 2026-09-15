import { Suspense } from "react";
import { cookies } from "next/headers";
import { AdminNav } from "@/modules/admin/components/admin-nav";
import { AdminSidebarShell } from "@/modules/admin/components/admin-sidebar-shell";
import {
  adminCan,
  getLogNavPermissions,
  getNavSectionPermissions,
  PERMISSIONS,
} from "@/modules/admin/lib/admin-can";
import {
  ADMIN_SIDEBAR_COLLAPSED_VALUE,
  ADMIN_SIDEBAR_COOKIE,
} from "@/modules/admin/lib/sidebar-preference";

// Two boundaries, not one, and the split is the point: this component awaits
// only a COOKIE, which costs nothing, so the sidebar's width and its logo bar
// resolve in the first streamed chunk. The permission reads — a real request to
// Laravel — sit behind their own Suspense inside the shell.
//
// Collapsing them into a single boundary is what the layout used to do, and it
// meant a collapsed admin watched a 16rem skeleton sit there for the length of
// an API round trip before snapping to 4rem. Now the correction, if any, is
// bounded by a cookie read.
export async function AdminSidebar() {
  const cookieStore = await cookies();
  const defaultCollapsed =
    cookieStore.get(ADMIN_SIDEBAR_COOKIE)?.value === ADMIN_SIDEBAR_COLLAPSED_VALUE;

  return (
    <AdminSidebarShell defaultCollapsed={defaultCollapsed}>
      <Suspense fallback={<AdminNavSkeleton />}>
        <AdminSidebarNav />
      </Suspense>
    </AdminSidebarShell>
  );
}

// Async because the nav hides permission-gated destinations — the profile read
// behind adminCan() is cache()-memoized per request, so it's the same fetch
// AdminHeader already makes, however many permissions the nav asks about.
//
// Passed to the client shell as `children`, which keeps it and the async
// sub-lists inside it on the server rather than in the client bundle.
async function AdminSidebarNav() {
  const [logs, sections, canBroadcast, canManageFeatureFlags] = await Promise.all([
    getLogNavPermissions(),
    getNavSectionPermissions(),
    adminCan(PERMISSIONS.notificationsBroadcast),
    adminCan(PERMISSIONS.developerAccess),
  ]);

  return (
    <AdminNav
      logs={logs}
      sections={sections}
      canBroadcast={canBroadcast}
      canManageFeatureFlags={canManageFeatureFlags}
    />
  );
}

// Inside the shell, so it inherits the real width — a collapsed sidebar streams
// a collapsed skeleton. Row count and padding match AdminNav's top-level
// entries; the rows are full-width either way, and at the rail they read as the
// icon squares they are about to become.
function AdminNavSkeleton() {
  return (
    <div aria-hidden className="space-y-1 p-4 group-data-[collapsed=true]/sidebar:px-2">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="h-9 w-full animate-pulse rounded-lg bg-muted/50" />
      ))}
    </div>
  );
}

// The LAYOUT's fallback, shown only while the cookie read is in flight — a
// different job from AdminNavSkeleton above, which stands in for the menu once
// the shell exists. It cannot know the admin's choice (that is the cookie it is
// waiting on), so it draws the expanded width: the majority case, and the one a
// first-time admin gets.
export function AdminSidebarSkeleton() {
  return (
    <aside
      aria-hidden
      className="hidden w-64 shrink-0 border-r border-border bg-sidebar lg:flex lg:flex-col"
    >
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <div className="ml-1 h-7 w-28 animate-pulse rounded bg-muted" />
        <div className="size-9 shrink-0 animate-pulse rounded-lg bg-muted/50" />
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-9 w-full animate-pulse rounded-lg bg-muted/50" />
        ))}
      </div>
    </aside>
  );
}
