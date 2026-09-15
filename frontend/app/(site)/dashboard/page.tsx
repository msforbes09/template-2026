import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Mail, Smartphone, UserRound } from "lucide-react";
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

// `registered` is the post-verify marker.
type DashboardSearchParams = Promise<{
  registered?: string | string[];
}>;

async function DashboardGuard({ searchParams }: { searchParams: DashboardSearchParams }) {
  await requireClientSession();
  const profile = await getClientProfile();
  const { registered: rawRegistered } = await searchParams;
  const registered = Array.isArray(rawRegistered) ? rawRegistered[0] : rawRegistered;
  const name = profile?.display_name ?? "there";
  const isDraft = profile?.status === "draft";
  // One-time nudge toward /dashboard/profile's "Contact information" card —
  // ?registered=1 is only ever set by client-register-form.tsx's post-verify
  // redirect, so this is true exactly once: the first real (non-draft)
  // dashboard render after registering. A later visit's plain /dashboard URL
  // never carries the marker, so there's no dismiss button or stored flag to
  // manage.
  const showContactNudge =
    registered === "1" && !!profile && !isDraft && (!profile.email || !profile.mobile_number);

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
              {profile?.email ?? profile?.mobile_number ?? "You're signed in."}
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

      {showContactNudge && profile && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
        >
          {!profile.email ? (
            <Mail aria-hidden className="mt-0.5 size-4 shrink-0" />
          ) : (
            <Smartphone aria-hidden className="mt-0.5 size-4 shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-medium">
              Add {!profile.email ? "an email" : "a mobile number"} as a backup contact
            </p>
            <p className="mt-0.5">
              {!profile.email
                ? "So you can still reach your account if you ever lose access to your mobile number."
                : "So you can still reach your account if you ever lose access to your email."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            nativeButton={false}
            render={<Link href="/dashboard/profile" />}
          >
            Add now
          </Button>
        </div>
      )}

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

export default function DashboardPage({ searchParams }: { searchParams: DashboardSearchParams }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardGuard searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
