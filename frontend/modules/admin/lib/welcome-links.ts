// The admin landing page's entry points, in menu order, filtered by the
// profile's flat permission list. Pure so the rule lives in one tested place.
//
// Boundary-free like nav-sections.ts: importable from either side.
export type WelcomeLink = { href: string; label: string; description: string };

type GatedLink = WelcomeLink & { permission: string | null };

const LINKS: GatedLink[] = [
  { href: "/admin/users", label: "Users", description: "Registered accounts.", permission: "users-view" },
  { href: "/admin/broadcasts", label: "Broadcasts", description: "Announcements to users.", permission: "notifications-broadcast" },
  { href: "/admin/audit-logs", label: "Audit logs", description: "Who changed what.", permission: "audit-logs-view" },
  { href: "/admin/auth-attempt-logs", label: "Auth attempts", description: "Sign-in history.", permission: "auth-logs-view" },
  { href: "/admin/connection-logs", label: "Connection logs", description: "Outbound calls.", permission: "connection-logs-view" },
  { href: "/admin/contents", label: "Content Blocks", description: "Site copy blocks.", permission: "contents-view" },
  { href: "/admin/gallery", label: "Gallery", description: "Uploaded images.", permission: "gallery-view" },
  { href: "/admin/administrators", label: "Administrators", description: "Console accounts.", permission: "administrators-view" },
  { href: "/admin/access-control", label: "Roles", description: "Roles and permissions.", permission: "roles-view" },
  { href: "/admin/feature-flags", label: "System Controls", description: "Maintenance mode.", permission: "developer-access" },
  { href: "/admin/settings", label: "Change password", description: "Your own credentials.", permission: null },
];

export function welcomeLinks(permissions: readonly string[]): WelcomeLink[] {
  return LINKS.filter((link) => link.permission === null || permissions.includes(link.permission)).map(
    ({ href, label, description }) => ({ href, label, description }),
  );
}
