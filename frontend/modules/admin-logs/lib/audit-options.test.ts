import { describe, expect, it } from "vitest";
import { AUDITABLE_TYPES } from "@/modules/admin-logs/lib/audit-options";

// The dropdown vocab is mirrored by hand from the WS (there is no endpoint that
// lists it), so it drifts silently: a type the backend stopped auditing stays
// selectable and returns nothing, and a newly audited model is unreachable.
// These lock the list to the models that actually use the Auditable trait.
describe("AUDITABLE_TYPES", () => {
  it("has no entry the backend cannot emit", () => {
    // There is no ProjectTag model or morph-map entry in the WS — tags are a
    // JSON column on Project, so tag changes audit as Project/updated.
    // Selecting it queried auditable_type=ProjectTag and always came back empty.
    expect(AUDITABLE_TYPES).not.toContain("ProjectTag");
  });

  it("covers the audited models the dropdown was missing", () => {
    for (const type of ["Broadcast", "EgovEvent", "GatewayQuota", "Review"]) {
      expect(AUDITABLE_TYPES).toContain(type);
    }
  });

  it("matches the WS Auditable set exactly, by morph-map short name", () => {
    expect([...AUDITABLE_TYPES]).toEqual([
      "Administrator",
      "ApiCatalog",
      "Broadcast",
      "Content",
      "Documentation",
      "EgovEvent",
      "File",
      "Gallery",
      "GatewayCredential",
      "GatewayQuota",
      "Permission",
      "PermissionGroup",
      "Project",
      "Review",
      "Role",
      "User",
    ]);
  });

  it("is sorted and free of duplicates, so the dropdown reads predictably", () => {
    const types = [...AUDITABLE_TYPES];

    expect(types).toEqual([...types].sort());
    expect(new Set(types).size).toBe(types.length);
  });
});
