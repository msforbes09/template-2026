import { IdleSessionWatcher } from "@/components/idle-session-watcher";
import { getAdminProfile } from "@/modules/admin/lib/get-admin-profile";
import { clearAdminSession, keepAdminSessionAlive } from "@/modules/admin/actions/session-actions";

// Mounts the idle-session countdown for the console from the same memoized
// profile read the shell already performs. Server actions are passed down as
// props so the watcher stays audience-agnostic.
export async function AdminIdleSession() {
  const profile = await getAdminProfile();
  if (!profile) return null;
  return (
    <IdleSessionWatcher
      windowMinutes={profile.session_inactivity_minutes}
      keepAlive={keepAdminSessionAlive}
      signOut={clearAdminSession}
      redirectTo="/admin/login"
    />
  );
}
