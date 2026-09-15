import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { AdminProfileView } from "@/modules/admin/components/admin-profile-view";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

function ProfileSkeleton() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />
      <div className="h-48 animate-pulse rounded-xl border border-border bg-muted/40" />
      <div className="h-56 animate-pulse rounded-xl border border-border bg-muted/40" />
    </div>
  );
}

export default function AdminProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profile"
        description="Your admin account. Names and email are managed by an administrator; your password is yours to change."
      />
      <Suspense fallback={<ProfileSkeleton />}>
        <AdminProfileView />
      </Suspense>
    </div>
  );
}
