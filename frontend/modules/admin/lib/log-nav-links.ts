// The log viewers' nav entries, plus the permission shape that gates them.
//
// Deliberately NOT in logs-nav.tsx ("use client") and NOT in admin-can.ts
// ("server-only"): AdminNav renders on the server (via AdminSidebar) and on
// the client (via MobileSidebar), and it needs to CALL visibleLogLinks rather
// than just render it. A function exported from a "use client" module can only
// be rendered as a component or passed as a prop — calling it from the server
// throws. Plain, boundary-free module, importable from either side.

// Which of the four log viewers an admin may see. Each type is gated by its
// own backend permission, so an admin can hold one and not the others.
export type LogNavPermissions = {
  gateway: boolean;
  connection: boolean;
  auth: boolean;
  audit: boolean;
};

// The four viewers, in the order they appear under the Logs parent. Keyed by
// the permission flag that reveals each one.
export const LOG_NAV_LINKS = [
  { key: "gateway", href: "/admin/gateway-logs", label: "Gateway" },
  { key: "connection", href: "/admin/connection-logs", label: "Connection" },
  { key: "auth", href: "/admin/auth-attempt-logs", label: "Auth Attempts" },
  { key: "audit", href: "/admin/audit-logs", label: "Audit" },
] as const satisfies readonly { key: keyof LogNavPermissions; href: string; label: string }[];

export function visibleLogLinks(logs: LogNavPermissions) {
  return LOG_NAV_LINKS.filter((link) => logs[link.key]);
}
