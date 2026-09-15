import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClientSignOutButton } from "@/modules/site/components/client-sign-out-button";
import { ClientUserMenu } from "@/modules/site/components/client-user-menu";
import { NotificationBellMount } from "@/modules/notifications/components/notification-bell-mount";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";

// `menu` is the header's own slot: a dropdown account menu.
//
// `stacked` is the mobile panel's: plain links laid out vertically. A dropdown
// can't live there — MobileMenu closes the whole panel on any click inside it,
// so the trigger would tear down its own anchor. The panel is already a list
// of links, so flat entries fit it better anyway.
export type AuthAreaVariant = "menu" | "stacked";

export async function SiteHeaderAuthArea({
  variant = "menu",
}: {
  variant?: AuthAreaVariant;
} = {}) {
  // cache()-memoized per request, so rendering this twice (desktop + mobile)
  // is still a single profile fetch.
  const profile = await getClientProfile();

  if (!profile) {
    return (
      <div className={variant === "stacked" ? "flex flex-col gap-2" : "flex items-center gap-3"}>
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login" />}>
          Log in
        </Button>
      </div>
    );
  }

  // The change-password action needs an email to rewrite the session cookie
  // with the token it mints; fail closed if the profile somehow lacks one.
  const canChangePassword = Boolean(profile.email);

  if (variant === "stacked") {
    return (
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard"
          className="rounded-md px-2 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Dashboard
        </Link>
        <Link
          href="/dashboard/notifications"
          className="rounded-md px-2 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Notifications
        </Link>
        <Link
          href="/dashboard/profile"
          className="rounded-md px-2 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Profile
        </Link>
        <ClientSignOutButton />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {/* Its own boundary: the bell needs a second request (the first page and
          the badge), and the account menu should not wait on it. The fallback
          is the same size as the real button, so nothing shifts when it
          arrives. */}
      <Suspense fallback={<div aria-hidden className="size-9" />}>
        <NotificationBellMount />
      </Suspense>
      <ClientUserMenu
        displayName={profile.display_name}
        email={profile.email}
        photoUrl={profile.photo?.url ?? null}
        canChangePassword={canChangePassword}
      />
    </div>
  );
}
