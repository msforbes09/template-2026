import { MaintenanceGate } from "@/modules/feature-flags/components/maintenance-gate";

// Dedicated auth shell — deliberately free of the SiteHeader/SiteFooter chrome
// used by `(site)`. Auth surfaces (login, register, forgot-password) are a
// focused, full-viewport experience; the "back to home" affordance lives in the
// shared AuthCard shell. Server Component (no interactivity at the shell level).
//
// Gated too: POST user/authenticate and user/register both 503 during
// maintenance, so a sign-in form that cannot sign anyone in is worse than
// saying plainly that the service is down.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <MaintenanceGate>
      <main className="min-h-dvh bg-background">{children}</main>
    </MaintenanceGate>
  );
}
