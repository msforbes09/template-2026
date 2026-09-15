import { requireClientSession } from "@/lib/auth/dal";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { canCreateProjects } from "@/modules/client-auth/lib/account";
import { LiveUsageChart } from "@/modules/gateway-usage/components/live-usage-chart";

// The citizen's live call rate, wherever their own usage is shown.
//
// One place that knows how to name the channel: the private `user.{uuid}` key
// comes off the profile, ownership is enforced server-side, and without a uuid
// nothing renders and no socket opens. Three callers now — the dashboard, the
// developers Usage tab and a catalog's own Usage tab — and the alternative was
// three copies of that lookup.
//
// getClientProfile is cache()-memoized per request, so a caller that already
// read the profile pays nothing for this.
export async function ClientLiveUsage({
  // Scopes the trace to one API. Pinned to the catalog on a catalog's own tab;
  // taken from the list's own ?platform= filter where the reader chooses it, so
  // the trace and the log beneath it always describe the same slice.
  platform = "",
  height,
  className,
}: {
  platform?: string;
  height?: string;
  className?: string;
}) {
  await requireClientSession();
  const profile = await getClientProfile();

  // Developer-only, like every surface it appears on: a basic account cannot
  // hold credentials, so its live trace could only ever be an empty chart
  // above the "needs a developer account" notice.
  if (!profile || !canCreateProjects(profile)) return null;

  return (
    <LiveUsageChart
      audience="client"
      channel={profile?.uuid ? `user.${profile.uuid}` : null}
      platform={platform}
      height={height}
      className={className}
    />
  );
}
