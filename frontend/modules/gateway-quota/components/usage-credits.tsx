import { requireClientSession } from "@/lib/auth/dal";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { canCreateProjects } from "@/modules/client-auth/lib/account";
import { CreditsCard } from "@/modules/gateway-quota/components/credits-meter";

// Reads the balance off GET /profile, where the API embeds it — there's no
// standalone credits endpoint, and the quota row is created on first read, so
// it's always present for a citizen with a session.
export async function UsageCredits() {
  await requireClientSession();
  const profile = await getClientProfile();

  // getClientProfile() swallows failures into null (see its own doc comment).
  // A missing balance isn't worth an error state next to the usage list — the
  // list itself reports any real outage.
  //
  // The account check is the same one the list runs: an account that cannot
  // call the gateway gets DeveloperOnlyNotice there, and a credit meter
  // sitting above that notice would contradict it. The API omits `credits`
  // for a basic account, so this only really bites for a suspended developer,
  // whose balance is still returned but no longer spendable.
  // `credits` is a LIST since 2026-08-24 (one pool per catalog). An empty
  // array is truthy, so length is the real check — a developer with no pools
  // yet should render nothing rather than an empty card.
  if (!profile?.credits?.length || !canCreateProjects(profile)) return null;

  return <CreditsCard credits={profile.credits} />;
}

// Matches CreditsCard: header block plus the pool grid (three across on
// desktop, two at sm, stacked on mobile). The pool count
// isn't known before the fetch, so this assumes three — the current partner
// set — which keeps the shift small either way rather than collapsing to the
// single-meter height the card had before it became a list.
export function UsageCreditsSkeleton() {
  return (
    <div
      aria-hidden
      className="w-full space-y-4 rounded-xl border border-border bg-card p-6"
    >
      <div className="flex items-center gap-2">
        <div className="size-8 animate-pulse rounded-lg bg-muted" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
          <div className="h-3 w-56 animate-pulse rounded bg-muted/60" />
        </div>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-[5.5rem] animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>
    </div>
  );
}
