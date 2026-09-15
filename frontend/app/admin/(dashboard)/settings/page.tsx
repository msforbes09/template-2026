import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdminSession } from "@/lib/auth/dal";
import { ChangePasswordForm } from "@/modules/admin/components/change-password-form";

export const metadata: Metadata = {
  title: "Change password",
  robots: { index: false, follow: false },
};

async function SettingsGuard() {
  await requireAdminSession();

  return (
    <section className="max-w-lg">
      <p className="text-sm text-muted-foreground">
        Choose a strong password you don&apos;t use anywhere else.
      </p>
      <ChangePasswordForm />
    </section>
  );
}

function SettingsSkeleton() {
  return (
    <div className="h-80 max-w-lg animate-pulse rounded-xl border border-dashed border-border bg-muted/40" />
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Change password</h1>
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsGuard />
      </Suspense>
    </div>
  );
}
