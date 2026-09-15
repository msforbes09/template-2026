import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Mail, Smartphone, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { requireClientSession } from "@/lib/auth/dal";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { AccountJourney } from "@/modules/client-auth/components/account-journey";
import { AccountStatePanel } from "@/modules/client-auth/components/account-state-panel";
import { DashboardExploreCards } from "@/modules/site/components/dashboard-explore-cards";
import { AccountTypeBadge } from "@/modules/client-auth/components/account-type-badge";
import { canCreateProjects } from "@/modules/client-auth/lib/account";
import { CreditsAlert } from "@/modules/gateway-quota/components/credits-alert";
import { DashboardCreditsCard } from "@/modules/gateway-quota/components/dashboard-credits-card";
import { FirstCredentialCard } from "@/modules/gateway-quota/components/first-credential-card";
import { needsFirstCredential } from "@/modules/gateway-quota/lib/first-credential";
import { DeveloperAccessLink } from "@/modules/site/components/developer-access-link";
import {
  ClientUsageDashboard,
  ClientUsageDashboardSkeleton,
} from "@/modules/gateway-usage/components/client-usage-dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

// `registered` is the post-verify marker; the rest drive the appended usage
// dashboard's window (see ClientUsageDashboard).
type DashboardSearchParams = Promise<{
  registered?: string | string[];
  interval?: string | string[];
  from?: string | string[];
  to?: string | string[];
  platform?: string | string[];
}>;

async function DashboardGuard({
  searchParams,
}: {
  searchParams: DashboardSearchParams;
}) {
  await requireClientSession();
  const profile = await getClientProfile();
  const { registered: rawRegistered } = await searchParams;
  const registered = Array.isArray(rawRegistered)
    ? rawRegistered[0]
    : rawRegistered;
  const name = profile?.display_name ?? "there";
  const isDraft = profile?.status === "draft";
  // One-time nudge toward /dashboard/profile's "Contact information" card —
  // ?registered=1 is only ever set by client-register-form.tsx's post-verify
  // redirect, and survives unchanged through the whole draft -> for_assessment
  // wizard (which never navigates away from /dashboard), so this is true
  // exactly once: the first real (non-draft) dashboard render after
  // registering. A later visit's plain /dashboard URL never carries the
  // marker, so there's no dismiss button or stored flag to manage.
  const showContactNudge =
    registered === "1" &&
    !!profile &&
    !isDraft &&
    (!profile.email || !profile.mobile_number);

  return (
    <section className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-14 ring-2 ring-primary/15">
            {profile?.photo?.url && (
              <AvatarImage src={profile.photo.url} alt={name} />
            )}
            <AvatarFallback
              aria-hidden
              className="bg-primary/10 text-base font-semibold text-primary"
            >
              {name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Welcome, {name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile?.email ?? "You're signed in with eGovPH."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {profile && <AccountTypeBadge profile={profile} />}
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
              Add {!profile.email ? "an email" : "a mobile number"} as a backup
              contact
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
          {/* The pre-approval lifecycle states get the journey stepper —
              draft with "complete your profile" as step 1 of 3, completed
              with rating & reviewing celebrated and applying optional, an
              application under review waiting in amber, a returned one with
              the remarks and resubmit on step 3 — plus public places to
              explore meanwhile.

              An approved developer gets their API credits here instead: the
              old "Developer account" panel only restated the Developer badge
              in the header and offered nothing to do, while how many calls
              are left is the one number they actually need. Suspended and
              pending keep the status panel, which explains a state they
              can't act on. */}
          {profile.status === "draft" ||
          profile.status === "completed" ||
          profile.status === "for_assessment" ||
          profile.status === "for_resubmission" ? (
            <>
              <AccountJourney status={profile.status} remarks={profile.assessment_remarks} />
              <DashboardExploreCards />
            </>
          ) : canCreateProjects(profile) ? (
            <>
              {/* A spent or nearly-spent pool outranks everything below —
                  failing calls are the first thing a developer must learn on
                  opening this page. Renders nothing while all pools are
                  healthy. */}
              <CreditsAlert credits={profile.credits ?? []} />

              {/* Before the numbers: a developer with no key yet has nothing
                  to read in them. Inert on a backend predating
                  credentials_count — see needsFirstCredential.

                  Still ahead of the usage dashboard below, and deliberately:
                  with no credential there are no calls, so usage would lead
                  with an empty state while the one useful action sat under
                  it. Everyone past that point gets usage first. */}
              {needsFirstCredential(profile, canCreateProjects(profile)) && <FirstCredentialCard />}

              {/* THE LEAD. How the integration is actually behaving is what a
                  working developer opens this page for, so it sits above the
                  allowance and the destination links rather than below them.
                  Its own boundary, so a slow aggregate read delays only
                  itself and changing the window re-suspends only this. */}
              <Suspense fallback={<ClientUsageDashboardSkeleton />}>
                <ClientUsageDashboard uuid={profile.uuid} searchParams={searchParams} />
              </Suspense>

            </>
          ) : (
            <AccountStatePanel profile={profile} />
          )}

          {/* The projects list is off the dashboard for now — the "My
              projects" card below leads to /dashboard/projects, which is the
              same list with room to breathe. DashboardProjectsSection is
              still exported and ready if it comes back. */}

          {/* Credentials, usage, projects and the showcase — developer-only
              destinations, so gated the same way. */}
          {canCreateProjects(profile) && (
            <DeveloperAccessLink>
              {/* `credits` is absent for anything that is not an approved
                  developer, and the card renders nothing on an empty list. */}
              <DashboardCreditsCard credits={profile.credits ?? []} />
            </DeveloperAccessLink>
          )}
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

export default function DashboardPage({
  searchParams,
}: {
  searchParams: DashboardSearchParams;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardGuard searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
