import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { requireClientSession } from "@/lib/auth/dal";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { AccountStatePanel } from "@/modules/client-auth/components/account-state-panel";
import { DashboardExploreCards } from "@/modules/site/components/dashboard-explore-cards";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

async function DashboardGuard() {
  await requireClientSession();
  const profile = await getClientProfile();
  const name = profile?.display_name ?? "there";
  const isDraft = profile?.status === "draft";

  return (
    <section className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-14 ring-2 ring-primary/15">
            {profile?.photo?.url && <AvatarImage src={profile.photo.url} alt={name} />}
            <AvatarFallback
              aria-hidden
              className="bg-primary/10 text-base font-semibold text-primary"
            >
              {name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Welcome, {name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile?.email ?? "You're signed in."}
            </p>
          </div>
        </div>
        {!isDraft && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            nativeButton={false}
            render={<Link href="/dashboard/profile" />}
          >
            <UserRound aria-hidden className="size-3.5" />
            View profile
          </Button>
        )}
      </div>

      {profile && (
        <>
          <AccountStatePanel profile={profile} />
          <DashboardExploreCards />
        </>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div
      aria-hidden
      className="mx-auto h-40 max-w-2xl animate-pulse rounded-xl border border-dashed border-border bg-muted/40"
    />
  );
}

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardGuard />
      </Suspense>
    </div>
  );
}
