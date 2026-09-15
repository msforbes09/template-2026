import { describe, expect, test } from "vitest";
import { userStatusLabel } from "@/modules/users/lib/user-status-label";

// The real lifecycle status, title-cased, for the users table badge and the
// view-user modal. (The sidebar submenu uses its own capability-oriented
// wording — Incomplete, Basic Access, Developer Access — but data surfaces
// show the status as it actually is.)
describe("userStatusLabel", () => {
  test.each([
    ["draft", "Draft"],
    ["completed", "Completed"],
    ["for_assessment", "For Assessment"],
    ["for_resubmission", "For Resubmission"],
    ["approved", "Approved"],
    ["suspended", "Suspended"],
  ])("labels %s as %s", (status, label) => {
    expect(userStatusLabel(status)).toBe(label);
  });

  // Legacy statuses still present in old rows (rejected, pending, …) fall
  // back to plain humanization rather than disappearing.
  test("humanizes statuses outside the vocabulary", () => {
    expect(userStatusLabel("rejected")).toBe("Rejected");
  });
});
