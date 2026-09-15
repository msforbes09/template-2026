import { describe, expect, it } from "vitest";
import {
  accountStatus,
  canCompleteProfile,
  detailsCooldown,
  hasCompletedProfile,
  photoCooldown,
} from "@/modules/client-auth/lib/account";
import { accountStatusCopy } from "@/modules/client-auth/lib/account-status";

describe("accountStatus", () => {
  it("narrows the two known statuses", () => {
    expect(accountStatus("draft")).toBe("draft");
    expect(accountStatus("completed")).toBe("completed");
  });

  // A backend that adds a status must not take the dashboard down.
  it("returns null for anything it doesn't recognise", () => {
    expect(accountStatus("approved")).toBeNull();
    expect(accountStatus("suspended")).toBeNull();
    expect(accountStatus(null)).toBeNull();
    expect(accountStatus(undefined)).toBeNull();
  });
});

describe("canCompleteProfile", () => {
  it("completes only from draft", () => {
    expect(canCompleteProfile({ status: "draft" })).toBe(true);
    expect(canCompleteProfile({ status: "completed" })).toBe(false);
  });
});

describe("hasCompletedProfile", () => {
  // Completion is stamped, not inferred from the status.
  it("reads the timestamp", () => {
    expect(hasCompletedProfile({ status: "completed" })).toBe(false);
    expect(hasCompletedProfile({ profile_completed_at: "2026-08-21 10:00:00" })).toBe(true);
  });
});

describe("cooldowns", () => {
  // The API owns the clocks and runs them separately; nothing is computed here.
  it("reads each clock independently, with null meaning editable now", () => {
    const account = {
      details_editable_at: "2026-09-20 10:12:45",
      photo_editable_at: null,
    };
    expect(detailsCooldown(account)).toEqual({ locked: true, until: "2026-09-20 10:12:45" });
    expect(photoCooldown(account)).toEqual({ locked: false, until: null });
  });

  it("treats an absent field as editable rather than locked", () => {
    expect(detailsCooldown({}).locked).toBe(false);
    expect(hasCompletedProfile({})).toBe(false);
  });
});

describe("accountStatusCopy", () => {
  it("names each state and says what to do next", () => {
    expect(accountStatusCopy({ status: "draft" })?.nextStep).toContain("Complete it");
    expect(accountStatusCopy({ status: "completed" })?.nextStep).toBeNull();
    expect(accountStatusCopy({ status: "completed" })?.tone).toBe("good");
  });

  it("returns nothing for an unrecognised status", () => {
    expect(accountStatusCopy({ status: "suspended" })).toBeNull();
  });
});

// Regression: saving profile details does NOT change status — only
// POST /profile/complete does. A draft therefore stays a draft across a save,
// so nothing may reintroduce a status-based redirect around the edit flow.
describe("a draft stays a draft across a details save", () => {
  it("keeps every capability decision stable when only details change", () => {
    const before = { status: "draft" };
    const after = { status: "draft", first_name: "Sam" };
    expect(accountStatus(after.status)).toBe(accountStatus(before.status));
    expect(hasCompletedProfile(after)).toBe(false);
    expect(canCompleteProfile(after)).toBe(true);
  });
});
