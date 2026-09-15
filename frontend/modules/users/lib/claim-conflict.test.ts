import { describe, expect, it } from "vitest";
import { claimConflict } from "@/modules/users/lib/claim-conflict";
import type { AdminUser } from "@/types/admin-user";

// The WS refuses a second claim with 400 assessment_already_in_progress and
// the held user in meta; this parses that failure into what the transfer
// dialog needs, and nothing else.
describe("claimConflict", () => {
  it("extracts the held user from the conflict failure", () => {
    expect(
      claimConflict({
        ok: false,
        status: 400,
        message: "You are already assessing another user.",
        errors: {},
        code: "assessment_already_in_progress",
        meta: { uuid: "abc-123", display_name: "Juan Cruz" },
      }),
    ).toEqual({ uuid: "abc-123", displayName: "Juan Cruz" });
  });

  it("returns null for success, other failures, and malformed meta", () => {
    expect(claimConflict({ ok: true, data: {} as AdminUser })).toBeNull();
    expect(
      claimConflict({ ok: false, status: 403, message: "no", errors: {}, code: "assessment_not_owned" }),
    ).toBeNull();
    expect(
      claimConflict({
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
