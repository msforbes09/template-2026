import "server-only";
import { getAdminProfile } from "@/modules/admin/lib/get-admin-profile";
import type { LogNavPermissions } from "@/modules/admin/lib/log-nav-links";
import {
  NO_NAV_SECTIONS,
  navSectionPermissions,
  type NavSectionPermissions,
} from "@/modules/admin/lib/nav-sections";

// Permission names the frontend gates UI on. These are the backend's
// PermissionEnum values — the API returns 403 regardless of what the UI
// shows, so these checks only decide whether a control is worth rendering.
export const PERMISSIONS = {
  usersView: "users-view",
  connectionLogsView: "connection-logs-view",
  authLogsView: "auth-logs-view",
  auditLogsView: "audit-logs-view",
  usersManage: "users-manage",
  contentsView: "contents-view",
  contentsManage: "contents-manage",
  documentationsView: "documentations-view",
  documentationsManage: "documentations-manage",
  galleryView: "gallery-view",
  galleryManage: "gallery-manage",
  administratorsView: "administrators-view",
  administratorsManage: "administrators-manage",
  rolesView: "roles-view",
  rolesManage: "roles-manage",
  // NOT a role permission. `developer-access` is granted at LOGIN to
  // is_developer administrators only, never through a role, and it deliberately
  // does not appear in the role-management permission catalog — so it will
  // never show up in Access Control for anyone to assign. It gates the whole
  // feature-flag surface.
  //
  // Consequence to expect rather than debug: an administrator promoted to
  // developer while signed in does not hold it until they sign in again,
  // because it is stamped on the token.
  developerAccess: "developer-access",
  // Its own `notifications` group, granted separately from everything above.
  // No role holds it until someone grants it, so an absent Broadcasts entry
  // is expected rather than a bug.
  notificationsBroadcast: "notifications-broadcast",
} as const;

// Re-exported so callers that already resolve permissions here don't need a
// second import. The type itself lives in log-nav-links.ts, which carries no
// "server-only" marker — the nav renders on both sides of the boundary.
export type { LogNavPermissions };

// Resolved once and passed to AdminNav as plain booleans — the nav is part of
// a client tree and can't read permissions itself. The profile read behind
// adminCan() is cache()-memoized per request, so the three checks cost one
// fetch however many callers ask.
export async function getLogNavPermissions(): Promise<LogNavPermissions> {
  const [connection, auth, audit] = await Promise.all([
    adminCan(PERMISSIONS.connectionLogsView),
    adminCan(PERMISSIONS.authLogsView),
    adminCan(PERMISSIONS.auditLogsView),
  ]);
  return { connection, auth, audit };
}

// The section flags for the nav entries gated by nav-sections.ts, resolved
// from the same memoized profile read as every other check here. Fails closed
// exactly like adminCan(): an unresolvable profile hides the gated entries.
export async function getNavSectionPermissions(): Promise<NavSectionPermissions> {
  const profile = await getAdminProfile();
  if (!profile || !Array.isArray(profile.permissions)) return NO_NAV_SECTIONS;
  return navSectionPermissions(profile.permissions);
}

// Whether the signed-in admin holds `permission`, read from GET /profile's
// flat `permissions` list (the token's abilities).
//
// FAILS CLOSED. This used to return true when permissions could not be
// resolved, on the reasoning that an unknown answer should not hide features
// that do work. That reasoning inverted under a forged session: a junk Bearer
// makes GET /profile 401, getAdminProfile() swallows it to null, and every
// permission then answered "yes" — so the entire admin console rendered for a
// caller who held nothing. Unresolved is now denial.
//
// Consequence worth knowing: against a backend build that does not return
// `permissions` at all, gated controls stay hidden rather than appearing.
// That is the intended direction of failure — a missing control is
// recoverable, a rendered one that should not exist is not — but it does mean
// a profile response missing the field looks like a permissions problem.
//
// The backend remains the real boundary; these checks only decide whether a
// control is worth rendering, and the screens behind them still render an
// explicit "no access" state on a 403.
export async function adminCan(permission: string): Promise<boolean> {
  const profile = await getAdminProfile();
  if (!profile || !Array.isArray(profile.permissions)) return false;
  return profile.permissions.includes(permission);
}
