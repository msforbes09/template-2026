import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  CircleCheck,
  ClipboardList,
  FolderKanban,
  LayoutGrid,
  ShieldAlert,
  UserRound,
  UserRoundCheck,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminSession } from "@/lib/auth/dal";
import { adminCan, PERMISSIONS } from "@/modules/admin/lib/admin-can";
import { DashboardGlance, DashboardStat } from "@/modules/admin/components/dashboard-stat";
import { getDashboardSummary } from "@/modules/admin/lib/dashboard-counts";

// Entry points, unfiltered — the stat tiles above them link to *filtered*
// views, so these stay as the way into the whole list.
const DESTINATIONS = [
  {
    href: "/admin/projects",
    label: "Projects",
    description: "Assess submissions, publish entries and curate the showcase.",
    icon: FolderKanban,
    permission: PERMISSIONS.projectsView,
  },
  {
    href: "/admin/users",
    label: "Users",
    description: "Review developer applications and manage accounts.",
    icon: UserRound,
    permission: PERMISSIONS.usersView,
  },
  {
    href: "/admin/egov-events",
    label: "eGov Events",
    description: "Programmes projects are entered into.",
    icon: CalendarRange,
    permission: PERMISSIONS.egovEventsView,
  },
  {
    href: "/admin/api-catalogs",
    label: "API Catalog",
    description: "The documentation shown for each published API.",
    icon: LayoutGrid,
    permission: PERMISSIONS.apiCatalogsView,
  },
];

// The admin landing page.
//
// It used to be the account-activation console — the kiosk QR, a live
// heartbeat chart and an activation feed. eGovPH SSO and the activation flow
// are gone, and with them the events those panels plotted, so restoring them
// would only have drawn a permanently flat line.
//
// What is here instead is the work actually waiting. Nothing is invented or
// derived: every figure is a real filter on a real screen, and each one links
// to exactly the list it counted, so a number and the page behind it cannot
// disagree.
export async function DashboardContent() {
  // The DAL guard for the count reads below, not a way to fetch a name.
  await requireAdminSession();

  // adminCan is memoized per request behind one profile read, so asking
  // repeatedly costs one fetch.
  const destinations = (
    await Promise.all(
      DESTINATIONS.map(async (destination) => ({
        ...destination,
        visible: await adminCan(destination.permission),
      })),
    )
  ).filter((destination) => destination.visible);

  // One request for every number. The BE mirrors the permission gating: an
  // admin without users-view gets no `users` block, so presence IS the
  // permission signal — no separate adminCan checks needed for the counts.
  const summary = await getDashboardSummary();
  const users = summary?.users ?? null;
  const projects = summary?.projects ?? null;
  const myClaims = (summary?.my_claims?.users ?? 0) + (summary?.my_claims?.projects ?? 0);

  const hasCounts = !!users || !!projects;

  // An account with no view permissions would otherwise render a heading over
  // an empty Manage list — a page that reads as broken rather than as
  // "nothing assigned yet". Say which it is instead. An admin holding ONLY
  // dashboard-view is NOT bare: the usage section above (a page-level sibling)
  // renders for them, so this component just stays out of the way — an empty
  // state under a working dashboard would contradict it.
  if (!hasCounts && destinations.length === 0) {
    if (await adminCan(PERMISSIONS.dashboardView)) return null;

    return (
      <EmptyState
        icon={ShieldAlert}
        title="You don't have permission to view this dashboard"
        description="Your account is active — it just hasn't been granted access to this area yet."
      />
    );
  }

  return (
    <div className="space-y-8">
      {hasCounts && (
        <section aria-labelledby="needs-attention" className="space-y-3">
          <h2 id="needs-attention" className="text-sm font-semibold tracking-tight">
            Needs your attention
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* The caller's own open claims lead: a held claim blocks every
                other admin until acted on (or the stale-claim sweep releases
                it), which makes it the most urgent number on the page. Both
                lists land on exactly MY claim via ?claimed=me. */}
            <DashboardStat
              label="Your open assessments"
              count={myClaims}
              href={
                (summary?.my_claims?.projects ?? 0) > 0
                  ? "/admin/projects?claimed=me"
                  : "/admin/users?claimed=me"
              }
              icon={ClipboardList}
              emptyLabel="No claims held"
            />
            {users && (
              <DashboardStat
                label="Developer applications"
                count={users.for_assessment}
                href="/admin/users?status=for_assessment"
                icon={UserRoundCheck}
                emptyLabel="No applications to review"
              />
            )}
            {projects && (
              <>
                <DashboardStat
                  label="Projects to assess"
                  count={projects.for_assessment}
                  href="/admin/projects?status=for_assessment"
                  icon={FolderKanban}
                  emptyLabel="Nothing waiting to be assessed"
                />
                <DashboardStat
                  label="Projects to publish"
                  count={projects.for_publishing}
                  href="/admin/projects?status=for_publishing"
                  icon={CircleCheck}
                  emptyLabel="Nothing cleared for publishing"
                />
              </>
            )}
          </div>
        </section>
      )}

      {hasCounts && (
        <section aria-labelledby="at-a-glance" className="space-y-3">
          <h2 id="at-a-glance" className="text-sm font-semibold tracking-tight">
            At a glance
          </h2>
          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card sm:flex-row sm:divide-x sm:divide-y-0">
            {users && (
              <>
                <DashboardGlance
                  label="Developer accounts"
                  count={users.developers}
                  href="/admin/users?type=developer"
                />
                <DashboardGlance
                  label="Suspended accounts"
                  count={users.suspended}
                  href="/admin/users?status=suspended"
                />
                {/* Waiting on the applicant, not on an admin — context for a
                    quiet queue, hence the glance strip and not a card. */}
                <DashboardGlance
                  label="Returned applications"
                  count={users.for_resubmission}
                  href="/admin/users?status=for_resubmission"
                />
              </>
            )}
            {projects && (
              <>
                <DashboardGlance
                  label="Published publicly"
                  count={projects.published}
                  href="/admin/projects?is_published=1"
                />
                <DashboardGlance
                  label="Projects sent back"
                  count={projects.for_resubmission}
                  href="/admin/projects?status=for_resubmission"
                />
              </>
            )}
          </div>
        </section>
      )}

      <section aria-labelledby="manage" className="space-y-3">
        <h2 id="manage" className="text-sm font-semibold tracking-tight">
          Manage
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {destinations.map((destination) => (
            <li key={destination.href}>
              <Link
                href={destination.href}
                className="group flex h-full items-start gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                >
                  <destination.icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    {destination.label}
                    <ArrowRight
                      aria-hidden
                      className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                    {destination.description}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// Mirrors the real layout: a queue row of three, the glance strip, then the
// destination grid.
export function DashboardSkeleton() {
  return (
    <div aria-hidden className="space-y-8">
      {/* No Live block: the section it mirrored is gone. */}
      <div className="space-y-3">
        <div className="h-4 w-36 animate-pulse rounded bg-muted/70" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-muted/60" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded bg-muted/70" />
        <div className="h-[70px] animate-pulse rounded-xl bg-muted/60" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-20 animate-pulse rounded bg-muted/70" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-muted/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
