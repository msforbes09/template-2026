import { describe, expect, it } from "vitest";
import { projectClaimConflict } from "@/modules/projects/lib/claim-conflict";
import type { AdminProject } from "@/types/project";

// The WS refuses a second project claim with 400 assessment_already_in_progress
// and the held project in meta (uuid + name — not display_name like the user
// variant); this parses that failure into what the transfer dialog needs, and
// nothing else.
describe("projectClaimConflict", () => {
  it("extracts the held project from the conflict failure", () => {
    expect(
      projectClaimConflict({
        ok: false,
        status: 400,
        message: "You are already assessing another project.",
        errors: {},
        code: "assessment_already_in_progress",
        meta: { uuid: "abc-123", name: "Barangay Portal" },
      }),
    ).toEqual({ uuid: "abc-123", name: "Barangay Portal" });
  });

  it("returns null for success, other failures, and malformed meta", () => {
    expect(projectClaimConflict({ ok: true, data: {} as AdminProject })).toBeNull();
    expect(
      projectClaimConflict({ ok: false, status: 403, message: "no", errors: {}, code: "assessment_not_owned" }),
    ).toBeNull();
    expect(
      projectClaimConflict({
        ok: false,
        status: 400,
        message: "no",
        errors: {},
        code: "assessment_already_in_progress",
        meta: { uuid: 5 },
      }),
    ).toBeNull();
  });
});
