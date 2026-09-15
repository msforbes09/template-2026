import { describe, expect, it } from "vitest";
import {
  ADMIN_PROJECT_MENU_LINKS,
  isProjectMenuActive,
} from "@/modules/projects/lib/admin-project-menu";

// The Projects submenu is a set of QUEUES, not a plain status list: Published
// means live, Hidden means approved-but-taken-down, and Pending Changes spans
// both review lanes for projects that are already live.
describe("ADMIN_PROJECT_MENU_LINKS", () => {
  it("splits published into the live and hidden queues", () => {
    const byLabel = Object.fromEntries(ADMIN_PROJECT_MENU_LINKS.map((l) => [l.label, l.query]));
    expect(byLabel.Published).toBe("status=published&is_published=1");
    expect(byLabel.Hidden).toBe("status=published&is_published=0");
  });

  it("gives live projects with queued updates their own entry", () => {
    const pending = ADMIN_PROJECT_MENU_LINKS.find((l) => l.label === "Pending Changes");
    expect(pending?.query).toBe("status=for_assessment,for_publishing&is_published=1");
  });
});

// Highlighting compares only the params a queue is defined by, so an unrelated
// param (a page, a search) never unhighlights the entry the admin is on.
describe("isProjectMenuActive", () => {
  it("matches its own queue", () => {
    expect(isProjectMenuActive("status=published&is_published=1", "status=published&is_published=1")).toBe(true);
  });

  it("ignores unrelated params", () => {
    expect(isProjectMenuActive("status=draft&page=3&q=wallet", "status=draft")).toBe(true);
  });

  it("separates the two published queues", () => {
    expect(isProjectMenuActive("status=published&is_published=0", "status=published&is_published=1")).toBe(false);
    expect(isProjectMenuActive("status=published", "status=published&is_published=1")).toBe(false);
  });

  it("does not match a bare status against the multi-status queue", () => {
    expect(isProjectMenuActive("status=for_assessment", "status=for_assessment,for_publishing&is_published=1")).toBe(false);
  });

  it("highlights nothing on the unfiltered list", () => {
    expect(ADMIN_PROJECT_MENU_LINKS.some((l) => isProjectMenuActive("", l.query))).toBe(false);
  });
});
