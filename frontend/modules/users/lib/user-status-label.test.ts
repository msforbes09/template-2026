import { describe, expect, it } from "vitest";
import { userStatusLabel } from "@/modules/users/lib/user-status-label";

describe("userStatusLabel", () => {
  it("labels the two lifecycle statuses", () => {
    expect(userStatusLabel("draft")).toBe("Draft");
    expect(userStatusLabel("completed")).toBe("Completed");
  });

  // A value this build does not know (an older row, a newer backend) still
  // renders as readable text rather than vanishing.
  it("humanizes anything else", () => {
    expect(userStatusLabel("for_assessment")).toBe("For Assessment");
  });
});
