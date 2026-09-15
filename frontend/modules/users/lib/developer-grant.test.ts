import { describe, expect, it } from "vitest";
import { canGrantDeveloper } from "@/modules/users/lib/developer-grant";

// The row gate for the direct developer grant. The endpoint accepts exactly
// one status and answers 400 invalid_status for the rest, so anything this
// lets through that the backend refuses is a button that can only fail.
describe("canGrantDeveloper", () => {
  it("offers the grant on a completed basic account", () => {
    expect(canGrantDeveloper({ status: "completed", type: "basic" })).toBe(true);
    // `type` is absent on older list payloads; a completed account is basic.
    expect(canGrantDeveloper({ status: "completed" })).toBe(true);
  });

  it("refuses every other status, which the API would 400", () => {
    for (const status of ["draft", "for_assessment", "for_resubmission", "approved", "suspended", "pending"]) {
      expect(canGrantDeveloper({ status, type: "basic" })).toBe(false);
    }
    expect(canGrantDeveloper({ status: null })).toBe(false);
  });

  // The two axes are independent, so this is checked rather than inferred:
  // "Make developer" on somebody who already is one is a nonsense control
  // however the API happens to answer it.
  it("refuses an account that is already a developer", () => {
    expect(canGrantDeveloper({ status: "completed", type: "developer" })).toBe(false);
  });

  // Suspension is the case worth pinning: a suspended developer is demoted to
  // basic but its status is `suspended`, not `completed` — so the grant must
  // not appear as a way around lifting the suspension first.
  it("refuses a suspended account even though it reads as basic", () => {
    expect(canGrantDeveloper({ status: "suspended", type: "basic" })).toBe(false);
  });
});
