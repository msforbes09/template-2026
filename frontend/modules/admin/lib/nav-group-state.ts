// Fold-state rules for the nav groups that carry a sub-list (Users, Projects,
// Logs). Boundary-free like log-nav-links.ts so the client NavGroup and the
// tests import the same logic; the sessionStorage plumbing stays in the
// component — these functions only decide.

export const NAV_GROUP_OPEN = "open";
export const NAV_GROUP_FOLDED = "folded";

// A manual toggle is scoped to the location (pathname + query) where it was
// made — encoded into the stored value so resolution stays pure and needs no
// clearing effect. The stored key stays "pathname" for shape compatibility.
export function encodeNavGroupToggle(state: string, location: string): string {
  return JSON.stringify({ state, pathname: location });
}

// Folded by default; the group holding the current route auto-opens; a manual
// toggle beats both, but only while still on the location where it was made —
// navigating anywhere else (a query-only submenu hop included) discards it,
// so groups fold on their own when left. Anything unparseable in storage
// (older builds' plain "open"/"folded", hand-edited values) reads as "not
// stored" rather than guessing a meaning.
export function resolveNavGroupOpen(
  stored: string | null,
  isActiveRoute: boolean,
  location: string,
): boolean {
  if (stored !== null) {
    try {
      const toggle: unknown = JSON.parse(stored);
      if (
        typeof toggle === "object" &&
        toggle !== null &&
        "state" in toggle &&
        "pathname" in toggle &&
        toggle.pathname === location
      ) {
        if (toggle.state === NAV_GROUP_OPEN) return true;
        if (toggle.state === NAV_GROUP_FOLDED) return false;
      }
    } catch {
      // Fall through to the route-derived default.
    }
  }
  return isActiveRoute;
}

// Whether `pathname` sits inside any of the group's route prefixes — the
// prefix's own page or anything nested under it. Segment-aware, so
// /admin/users-archive is not inside /admin/users.
export function isGroupRoute(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// The location string toggles are scoped to. Submenu entries navigate by
// query string alone (/admin/projects?status=…), so scoping to the bare
// pathname would let a manual toggle survive every submenu click; including
// the query makes any navigation — query-only included — discard it.
export function navGroupLocation(pathname: string, search: string): string {
  return search ? `${pathname}?${search}` : pathname;
}
