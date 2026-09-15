import { NotificationBell } from "@/modules/notifications/components/notification-bell";
import {
  getNotifications,
  PANEL_PAGE_SIZE,
} from "@/modules/notifications/lib/get-notifications";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";

// Server wrapper for the bell: fetches the first page and the badge count, and
// resolves the user's own broadcast channel.
//
// Split from the bell itself so the client bundle carries only the interactive
// part — the fetch, the session guard and the uuid lookup all stay on the
// server. It also keeps the badge correct on first paint, rather than
// appearing a moment after hydration.
//
// getClientProfile is cache()-memoized per request, so this does not cost a
// second profile fetch on a page whose header already asked for one.
export async function NotificationBellMount() {
  const profile = await getClientProfile();
  if (!profile) return null;

  const initial = await getNotifications({ perPage: PANEL_PAGE_SIZE });

  return (
    <NotificationBell
      initial={initial}
      // Echo.private() prepends "private-" itself. Null rather than a guessed
      // channel if the uuid is somehow absent — the bell still renders, it
      // just will not live-update.
      channel={profile.uuid ? `user.${profile.uuid}` : null}
    />
  );
}
