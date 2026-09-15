import { describe, expect, it } from "vitest";
import { ACTOR_TYPES, AUDITABLE_TYPES, AUDIT_EVENTS } from "@/modules/admin-logs/lib/audit-options";

// The dropdown vocab is mirrored by hand from the backend; pinning it here
// turns a drift into a failing test instead of a filter that silently returns
// nothing.
describe("audit options", () => {
  it("matches the backend's Auditable set exactly, by morph-map short name", () => {
    expect([...AUDITABLE_TYPES]).toEqual([
      "Administrator",
      "Broadcast",
      "Content",
      "Documentation",
      "File",
      "Gallery",
      "Permission",
      "PermissionGroup",
      "Role",
      "User",
    ]);
  });

  it("lists the audited events including the PII-access and sync ones", () => {
    expect(AUDIT_EVENTS).toContain("accessed");
    expect(AUDIT_EVENTS).toContain("sync");
  });

  it("names the two actor audiences", () => {
    expect([...ACTOR_TYPES]).toEqual(["Administrator", "User"]);
  });
});
