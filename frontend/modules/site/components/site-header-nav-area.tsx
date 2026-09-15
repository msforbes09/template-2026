import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { SiteHeaderNav } from "@/modules/site/components/site-header-nav";

// Supplies the session bit the nav can't read itself: SiteHeaderNav is a
// client component (it needs usePathname), and the marketing link set gains a
// Dashboard entry for a signed-in user.
//
// getClientProfile is cache()-memoized per request, so this shares the fetch
// SiteHeaderAuthArea already makes rather than adding one. It sits inside the
// header's existing Suspense boundary, keeping the layout root free of
// request-time data for PPR.
export async function SiteHeaderNavArea({
  authArea,
  mobileAuthArea,
}: {
  authArea: React.ReactNode;
  mobileAuthArea: React.ReactNode;
}) {
  const profile = await getClientProfile();

  return (
    <SiteHeaderNav
      authArea={authArea}
      mobileAuthArea={mobileAuthArea}
      isAuthenticated={Boolean(profile)}
    />
  );
}
