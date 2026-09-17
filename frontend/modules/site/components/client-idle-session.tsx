import { IdleSessionWatcher } from "@/components/idle-session-watcher";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import {
  clearClientSession,
  keepClientSessionAlive,
} from "@/modules/client-auth/actions/session-actions";

// Mounts the idle-session countdown for a signed-in user on every (site)
// page, from the memoized profile read the header already performs; renders
// nothing for visitors.
export async function ClientIdleSession() {
  const profile = await getClientProfile();
  if (!profile) return null;
  return (
    <IdleSessionWatcher
      windowMinutes={profile.session_inactivity_minutes}
      keepAlive={keepClientSessionAlive}
      signOut={clearClientSession}
      redirectTo="/login"
    />
  );
}
