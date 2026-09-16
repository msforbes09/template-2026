import { describe, expect, it } from "vitest";
import { accessControlLinks, navSectionPermissions, settingsLinks } from "@/modules/admin/lib/nav-sections";

// The mapping from the profile's permission list to the always-rendered nav
// entries that gain gating (Users, Content Blocks, Gallery,
// Administrators, Access Control). Pure, so the one place the menu's
// visibility rules live is under test — the components just read booleans.
describe("navSectionPermissions", () => {
  it("reveals each section by its own view permission", () => {
    expect(
      navSectionPermissions([
        "users-view",
        "contents-view",
        "gallery-view",
        "administrators-view",
        "roles-view",
      ]),
    ).toEqual({
      users: true,
      contents: true,
      gallery: true,
      administrators: true,
      roles: true,
    });
  });

  // Strictly own-permission: the WS does let administrators-view read the
  // roles LIST (the admins screen needs the role picker), but a menu entry
  // that appears without roles-view reads as ungated — each child of the
  // Access Control group is conditioned on its own view permission.
  it("shows Roles only on roles-view", () => {
    expect(navSectionPermissions(["roles-view"]).roles).toBe(true);
    expect(navSectionPermissions(["administrators-view"]).roles).toBe(false);
  });

  it("fails closed on an empty list", () => {
    expect(navSectionPermissions([])).toEqual({
      users: false,
      contents: false,
      gallery: false,
      administrators: false,
      roles: false,
    });
  });

  // Manage does not imply view here — the WS nests manage INSIDE the view
  // gate, so a manage-only token cannot reach the list screens anyway.
  it("does not treat a manage permission as its view", () => {
    const sections = navSectionPermissions(["contents-manage", "gallery-manage"]);
    expect(sections.contents).toBe(false);
    expect(sections.gallery).toBe(false);
  });
});

// The Access Control group's children (Administrators, Roles), filtered the
// way visibleLogLinks filters the log viewers. The parent entry is expected
// to vanish with the last child and to point at the first visible one.
describe("accessControlLinks", () => {
  const sections = (over: Partial<Parameters<typeof accessControlLinks>[0]>) => ({
    users: false,
    catalogs: false,
    contents: false,
    gallery: false,
    administrators: false,
    roles: false,
    ...over,
  });

  it("lists both children for a full-access admin", () => {
    expect(accessControlLinks(sections({ administrators: true, roles: true }))).toEqual([
      { href: "/admin/administrators", label: "Administrators" },
      { href: "/admin/access-control", label: "Roles" },
    ]);
  });

  it("drops the child whose permission is missing", () => {
    expect(accessControlLinks(sections({ roles: true }))).toEqual([
      { href: "/admin/access-control", label: "Roles" },
    ]);
    expect(accessControlLinks(sections({ administrators: true }))).toEqual([
      { href: "/admin/administrators", label: "Administrators" },
    ]);
  });

  it("is empty when neither flag holds, so the parent can vanish", () => {
    expect(accessControlLinks(sections({}))).toEqual([]);
  });
});

// The Settings group's children. Change password is self-service and always
// present; System Controls (the feature-flags screen) appears only for
// developer administrators — the same gate as its old top-level entry.
describe("settingsLinks", () => {
  it("puts Change password first, System Controls after for developers", () => {
    expect(settingsLinks(true)).toEqual([
      { href: "/admin/settings", label: "Change password" },
      { href: "/admin/feature-flags", label: "System Controls" },
    ]);
  });

  it("keeps only Change password for a non-developer", () => {
    expect(settingsLinks(false)).toEqual([
      { href: "/admin/settings", label: "Change password" },
    ]);
  });
});
