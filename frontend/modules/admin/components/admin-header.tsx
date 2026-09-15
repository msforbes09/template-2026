import { Terminal } from "lucide-react";
import { getAdminProfile } from "@/modules/admin/lib/get-admin-profile";
import {
  adminCan,
  getLogNavPermissions,
  getNavSectionPermissions,
  PERMISSIONS,
} from "@/modules/admin/lib/admin-can";
import { MobileSidebar } from "@/modules/admin/components/mobile-sidebar";
import { AdminUserMenu } from "@/modules/admin/components/admin-user-menu";
import { SignOutButton } from "@/modules/admin/components/sign-out-button";
import { AdminLiveStatus } from "@/modules/admin/components/admin-live-status";

export async function AdminHeader() {
  const profile = await getAdminProfile();
  // The mobile sidebar renders the same nav as the desktop one, and can't
  // read permissions itself (it's a client component) — resolve them here.
  const [logs, sections, canViewProjects, canViewEvents, canBroadcast, canManageFeatureFlags] = await Promise.all([
    getLogNavPermissions(),
    getNavSectionPermissions(),
    adminCan(PERMISSIONS.projectsView),
    adminCan(PERMISSIONS.egovEventsView),
    adminCan(PERMISSIONS.notificationsBroadcast),
    adminCan(PERMISSIONS.developerAccess),
  ]);

  return (
    // shrink-0: the header is a fixed band at the top of the content column,
    // so it must not be compressed by whatever <main> holds below it.
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <MobileSidebar
          logs={logs}
          sections={sections}
          canViewProjects={canViewProjects}
          canViewEvents={canViewEvents}
          canBroadcast={canBroadcast}
          canManageFeatureFlags={canManageFeatureFlags}
        />
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Terminal className="size-5" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-foreground">Admin Console</p>
          <p className="truncate text-xs text-muted-foreground">eGovAPIs Operations</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <AdminLiveStatus />
        {profile ? (
          <AdminUserMenu
            firstName={profile.first_name}
            lastName={profile.last_name}
            email={profile.email}
            photoUrl={profile.photo?.url ?? null}
          />
        ) : (
          // getAdminProfile() returns null on any read failure, not just a
          // missing session. Without it there's no name to hang a menu off,
          // but signing out must stay reachable — that's the one action an
          // admin looking at a broken header actually needs.
          <SignOutButton />
        )}
      </div>
    </header>
  );
}
