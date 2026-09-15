import { describe, expect, it, test } from "vitest";
import { claimState, isClaimedByOtherAdmin } from "@/modules/users/lib/assessment-claim";

// Claim-gated row actions (approve, return, suspend, release) only work for
// the admin who started the assessment — the API answers 403
// assessment_not_owned for anyone else. This seam decides when to hide them.
describe("isClaimedByOtherAdmin", () => {
  const claimed = { is_assessment_started: 1 as const, assessment_started_by_id: 7 };

  test("true when another admin holds the claim", () => {
    expect(isClaimedByOtherAdmin(claimed, 3)).toBe(true);
  });

  test("false when the signed-in admin holds the claim", () => {
    expect(isClaimedByOtherAdmin(claimed, 7)).toBe(false);
  });

  test("false when no assessment is started", () => {
    expect(
      isClaimedByOtherAdmin({ is_assessment_started: 0, assessment_started_by_id: null }, 3),
    ).toBe(false);
  });

  // Until the WS ships assessment_started_by_id on the list, the field is
  // absent — keep today's behavior (actions visible, server still 403s).
  test("false when the owner id is not in the payload", () => {
    expect(isClaimedByOtherAdmin({ is_assessment_started: 1 }, 3)).toBe(false);
  });

  // Identity unknown (profile fetch failed) — don't guess, keep actions.
  test("false when the signed-in admin id is unknown", () => {
    expect(isClaimedByOtherAdmin(claimed, null)).toBe(false);
  });
});

// The row's one adaptive affordance: which claim state the account is in,
// from this admin's seat — it decides the button's label and whether the
// click claims first or just opens the details.
describe("claimState", () => {
  it("is unclaimed when no assessment is started", () => {
    expect(claimState({ is_assessment_started: 0, assessment_started_by_id: null }, 7)).toBe(
      "unclaimed",
    );
  });

  it("is mine when this admin holds the claim", () => {
    expect(claimState({ is_assessment_started: 1, assessment_started_by_id: 7 }, 7)).toBe("mine");
  });

  it("is other when a different admin holds it", () => {
    expect(claimState({ is_assessment_started: 1, assessment_started_by_id: 9 }, 7)).toBe("other");
  });

  it("reads a claim with missing attribution as mine (fails open, server still enforces)", () => {
    expect(claimState({ is_assessment_started: 1, assessment_started_by_id: null }, 7)).toBe("mine");
    expect(claimState({ is_assessment_started: 1, assessment_started_by_id: 9 }, null)).toBe("mine");
  });
});
