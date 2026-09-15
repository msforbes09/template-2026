import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardContent, DashboardSkeleton } from "@/modules/admin/components/dashboard-content";
import {
  AdminUsageDashboard,
  AdminUsageDashboardSkeleton,
} from "@/modules/gateway-usage/components/admin-usage-dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

// Drives the appended gateway-usage section's window and its per-developer
// drill. Awaited inside that section's own boundary, never here — reading it
// at the page root would put the whole dashboard behind loading.tsx on every
// window change.
type AdminDashboardSearchParams = Promise<{
  interval?: string | string[];
  from?: string | string[];
  to?: string | string[];
  platform?: string | string[];
  user_uuid?: string | string[];
}>;

export default function AdminDashboardPage({
  searchParams,
}: {
  searchParams: AdminDashboardSearchParams;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      {/* THE LEAD. How the gateway is actually behaving outranks the account
          counts and the entry points below it, so it opens the page.
          A sibling rather than folded into DashboardContent, so that
          component is untouched and the two render at their own pace.
          Renders nothing for an admin without `dashboard-view` — the rest of
          the dashboard still works for them. */}
      <Suspense fallback={<AdminUsageDashboardSkeleton />}>
        <AdminUsageDashboard searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
