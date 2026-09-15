import { describe, expect, it } from "vitest";
import { isNavActive } from "@/modules/admin/lib/nav-active";

// The sidebar entry stays lit on the section's DETAIL pages, not just the
// list — /admin/projects/{uuid} still belongs to Projects. The dashboard
// root is the exception: as a prefix of everything it matches only itself.
describe("isNavActive", () => {
  it("matches the exact path", () => {
    expect(isNavActive("/admin/projects", "/admin/projects")).toBe(true);
  });

  it("matches the section's subpages", () => {
    expect(isNavActive("/admin/projects/abc-123", "/admin/projects")).toBe(true);
    expect(isNavActive("/admin/projects/abc-123/edit", "/admin/projects")).toBe(true);
  });

  it("never bleeds across sibling sections", () => {
    expect(isNavActive("/admin/projects-x", "/admin/projects")).toBe(false);
    expect(isNavActive("/admin/users", "/admin/projects")).toBe(false);
  });

  it("keeps the dashboard root exact", () => {
    expect(isNavActive("/admin", "/admin")).toBe(true);
    expect(isNavActive("/admin/projects", "/admin")).toBe(false);
  });

  it("ignores a query string on the href", () => {
    expect(isNavActive("/admin/gateway-logs", "/admin/gateway-logs?status_code=5xx")).toBe(true);
  });
});
