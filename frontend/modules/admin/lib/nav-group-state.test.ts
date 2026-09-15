import { describe, expect, it } from "vitest";
import {
  encodeNavGroupToggle,
  isGroupRoute,
  NAV_GROUP_FOLDED,
  NAV_GROUP_OPEN,
  resolveNavGroupOpen,
  navGroupLocation,
} from "@/modules/admin/lib/nav-group-state";

// The fold state of a nav group (Users / Projects / Logs). Folded by default;
// the group containing the current route auto-opens; a manual toggle wins over
// both — but only on the pathname where it was made. Navigating anywhere else
// discards it, so groups fold on their own when you leave them. Pure, so the
// precedence lives in one tested place — the NavGroup component just renders
// the boolean.
describe("resolveNavGroupOpen", () => {
  it("folds by default when nothing is stored and the route is elsewhere", () => {
    expect(resolveNavGroupOpen(null, false, "/admin/api-docs")).toBe(false);
  });

  it("auto-opens the group the current route lives in", () => {
    expect(resolveNavGroupOpen(null, true, "/admin/projects")).toBe(true);
  });

  it("lets a manual toggle win over the route on the page where it was made", () => {
    const foldedHere = encodeNavGroupToggle(NAV_GROUP_FOLDED, "/admin/projects");
    expect(resolveNavGroupOpen(foldedHere, true, "/admin/projects")).toBe(false);

    const openedHere = encodeNavGroupToggle(NAV_GROUP_OPEN, "/admin/api-docs");
    expect(resolveNavGroupOpen(openedHere, false, "/admin/api-docs")).toBe(true);
  });

  it("discards a manual toggle after navigating to a different page", () => {
    // Unfolded Projects while on API Catalog, then moved on: folds again.
    const openedElsewhere = encodeNavGroupToggle(NAV_GROUP_OPEN, "/admin/api-docs");
    expect(resolveNavGroupOpen(openedElsewhere, false, "/admin/contents")).toBe(false);

    // Folded the active group by hand, then navigated within it: reopens.
    const foldedElsewhere = encodeNavGroupToggle(NAV_GROUP_FOLDED, "/admin/projects");
    expect(resolveNavGroupOpen(foldedElsewhere, true, "/admin/projects/draft")).toBe(true);
  });

  it("treats an unrecognized stored value as not stored", () => {
    expect(resolveNavGroupOpen("garbage", true, "/admin/projects")).toBe(true);
    expect(resolveNavGroupOpen("garbage", false, "/admin/projects")).toBe(false);
    // Pre-pathname-scoping values from older builds read as not stored too.
    expect(resolveNavGroupOpen("open", false, "/admin/projects")).toBe(false);
    expect(resolveNavGroupOpen("folded", true, "/admin/projects")).toBe(true);
  });
});

describe("isGroupRoute", () => {
  it("matches the group's own page and pages nested under it", () => {
    expect(isGroupRoute("/admin/users", ["/admin/users"])).toBe(true);
    expect(isGroupRoute("/admin/projects/abc-123", ["/admin/projects"])).toBe(true);
  });

  it("matches any of several prefixes — the Logs group spans four viewers", () => {
    const logs = [
      "/admin/gateway-logs",
      "/admin/connection-logs",
      "/admin/auth-attempt-logs",
      "/admin/audit-logs",
    ];
    expect(isGroupRoute("/admin/audit-logs", logs)).toBe(true);
    expect(isGroupRoute("/admin/contents", logs)).toBe(false);
  });

  // Prefix matching must respect segment boundaries: /admin/users-archive is
  // NOT inside the /admin/users group.
  it("does not match a sibling route that merely shares the prefix string", () => {
    expect(isGroupRoute("/admin/users-archive", ["/admin/users"])).toBe(false);
  });
});

// Submenu entries navigate by QUERY STRING alone (/admin/projects?status=…),
// so a toggle scoped only to the pathname would survive every submenu click
// — a Users group unfolded on /admin/projects stayed open across the whole
// Projects submenu. Toggles scope to the full location instead.
describe("navGroupLocation", () => {
  it("appends the query string when present", () => {
    expect(navGroupLocation("/admin/projects", "status=published")).toBe(
      "/admin/projects?status=published",
    );
  });

  it("is the bare pathname when there is none", () => {
    expect(navGroupLocation("/admin/projects", "")).toBe("/admin/projects");
  });

  it("scopes a toggle away when only the query changes", () => {
    const stored = encodeNavGroupToggle(
      NAV_GROUP_OPEN,
      navGroupLocation("/admin/projects", "status=draft"),
    );
    expect(
      resolveNavGroupOpen(stored, false, navGroupLocation("/admin/projects", "status=published")),
    ).toBe(false);
  });
});
