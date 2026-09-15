import { describe, expect, it } from "vitest";
import { welcomeLinks } from "@/modules/admin/lib/welcome-links";

// The admin landing page's entry points, filtered by the profile's flat
// permission list. Pure so the rule lives in one tested place.
describe("welcomeLinks", () => {
  it("lists only the modules the permissions allow, in menu order", () => {
    expect(welcomeLinks(["gallery-view", "users-view"]).map((l) => l.href)).toEqual([
      "/admin/users",
      "/admin/gallery",
      "/admin/settings",
    ]);
  });

  it("always offers the change-password screen", () => {
    expect(welcomeLinks([]).map((l) => l.href)).toEqual(["/admin/settings"]);
  });

  it("gates system controls on developer-access", () => {
    expect(welcomeLinks(["developer-access"]).map((l) => l.href)).toContain("/admin/feature-flags");
    expect(welcomeLinks(["roles-manage"]).map((l) => l.href)).not.toContain("/admin/feature-flags");
  });
});
