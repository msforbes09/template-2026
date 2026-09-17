import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminWelcome } from "@/modules/admin/components/admin-welcome";
import { PasswordExpiryBanner } from "@/modules/admin/components/password-expiry-banner";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <PasswordExpiryBanner />
      </Suspense>
      <Suspense fallback={<div aria-hidden className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <AdminWelcome />
      </Suspense>
    </div>
  );
}
