import { MaintenancePage } from "@/modules/feature-flags/components/maintenance-page";
import { isFeatureEnabled } from "@/modules/feature-flags/lib/get-feature-flags";

// Signal one of the two the handoff asks for: read `maintenance_mode` on load
// and, when it is on, render the maintenance page INSTEAD of the site.
//
// NO connection() HERE, unlike every other flag check in this codebase, and
// the reason is worth writing down because it looks like an omission.
//
// This wraps a LAYOUT. `connection()` here is uncached data accessed outside a
// Suspense boundary, which under cacheComponents fails the build outright
// ("Uncached data was accessed outside of <Suspense>" on /dashboard/profile) —
// it blocks every route in the group from prerendering. Wrapping the gate in
// Suspense instead would push the entire site into a dynamic hole behind a
// blank fallback, which is worse than what it fixes.
//
// So this reads the flag through the cached map and accepts a bounded
// staleness. Three things make that safe:
//
//   1. getFeatureFlags has cacheLife("minutes"), so a flip lands on its own.
//   2. Toggling from the admin screen revalidates FEATURE_FLAGS_TAG, so a
//      deliberate change lands at once rather than waiting that out.
//   3. The 503 `service_unavailable` interceptor is the other half of the
//      handoff's "use both signals", and it needs no successful read at all —
//      it catches anyone mid-session during the gap.
//
// The failure direction is right, too: getFeatureFlags fails OPEN, so an
// unreachable flag endpoint shows the site rather than throwing a maintenance
// page in front of a working one.
export async function MaintenanceGate({ children }: { children: React.ReactNode }) {
  if (await isFeatureEnabled("maintenance_mode")) return <MaintenancePage />;

  return <>{children}</>;
}
