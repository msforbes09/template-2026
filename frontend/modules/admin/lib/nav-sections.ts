// The permission gating for the nav entries that used to render
// unconditionally (Users, Content Blocks, Gallery,
// Administrators, Access Control). Dashboard and Settings stay ungated on
// purpose: Dashboard is the landing route, and Settings is the admin's own
// change-password screen — self-service, with no backend permission behind it.
//
// Boundary-free like log-nav-links.ts, and for the same reason: AdminNav
// renders on the server (AdminSidebar) and inside a client tree
// (MobileSidebar), so this module must be importable from either side. The
// server resolver lives in admin-can.ts.

// Which of the five gated sections an admin may see, as plain booleans the nav
// can take across the client boundary.
export type NavSectionPermissions = {
  users: boolean;
  contents: boolean;
  gallery: boolean;
  administrators: boolean;
  roles: boolean;
};

// Every flag false — the client default, and what an unresolvable profile
// maps to. Failing closed here matches adminCan(): a missing entry is
// recoverable, a rendered one that should not exist is not.
export const NO_NAV_SECTIONS: NavSectionPermissions = {
  users: false,
  contents: false,
  gallery: false,
  administrators: false,
  roles: false,
};

// The profile's flat permission list (the token's abilities) mapped to the
// section flags. Each section keys off its backend `*-view` permission —
// manage never implies view, because the WS nests the manage gate INSIDE the
// view gate, so a manage-only token cannot reach the list screens anyway.
export function navSectionPermissions(permissions: readonly string[]): NavSectionPermissions {
  const has = (permission: string) => permissions.includes(permission);

  return {
    users: has("users-view"),
    contents: has("contents-view"),
    gallery: has("gallery-view"),
    administrators: has("administrators-view"),
    // Strictly roles-view. The WS does let administrators-view read the roles
    // LIST (ability: any-of — the admins screen needs the role picker), but a
    // menu child appearing without its own permission reads as ungated, so
    // the Roles entry holds itself to roles-view; the screen stays reachable
    // by URL for an administrators-view admin, as the WS intends.
    roles: has("roles-view"),
  };
}

// The Access Control group's children, in menu order — the visibleLogLinks
// pattern. Administrators moved under this parent (2026-09-02); the roles
// screen keeps its /admin/access-control route but reads as "Roles" now that
// the group carries the Access Control name. Empty when neither flag holds,
// which is the parent entry's cue to vanish; the parent links to the first
// entry, so it must stay reachable for whoever can see the group.
export function accessControlLinks(
  sections: NavSectionPermissions,
): { href: string; label: string }[] {
  return [
    ...(sections.administrators
      ? [{ href: "/admin/administrators", label: "Administrators" }]
      : []),
    ...(sections.roles ? [{ href: "/admin/access-control", label: "Roles" }] : []),
  ];
}

// The Settings group's children, in menu order: Change password (the
// /admin/settings screen) first — self-service with no backend permission,
// always present, and the entry the parent links to, matching the
// parent-links-to-first-child convention — then System Controls (the
// feature-flags screen), still gated on developer-access exactly as its old
// top-level entry was; the route keeps its /admin/feature-flags name so
// nothing pointing at it moves. The group never vanishes because its first
// child is reachable by every admin.
export function settingsLinks(
  canManageFeatureFlags: boolean,
): { href: string; label: string }[] {
  return [
    { href: "/admin/settings", label: "Change password" },
    ...(canManageFeatureFlags
      ? [{ href: "/admin/feature-flags", label: "System Controls" }]
      : []),
  ];
}
