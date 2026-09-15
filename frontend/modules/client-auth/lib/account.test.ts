import { describe, expect, it } from "vitest";
import {
  accountStatus,
  canApplyAsDeveloper,
  canCompleteProfile,
  canCreateProjects,
  canEditProfile,
  canReview,
  canReviewCatalogs,
  detailsCooldown,
  hasCompletedProfile,
  isDeveloper,
  isSuspended,
  photoCooldown,
} from "@/modules/client-auth/lib/account";
import {
  accountStatusCopy,
  describeNextStep,
  parseRemarks,
  suspensionReason,
} from "@/modules/client-auth/lib/account-status";

describe("accountStatus", () => {
  it("narrows the known statuses", () => {
    expect(accountStatus("approved")).toBe("approved");
    expect(accountStatus("for_resubmission")).toBe("for_resubmission");
  });

  // A backend that adds a status must not take the dashboard down.
  it("returns null for anything it doesn't recognise", () => {
    expect(accountStatus("rejected")).toBeNull();
    expect(accountStatus(null)).toBeNull();
    expect(accountStatus(undefined)).toBeNull();
  });
});

describe("the two axes are independent", () => {
  it("reads type for capability and status for lifecycle", () => {
    const suspendedDeveloper = { status: "suspended", type: "developer" as const };
    expect(isDeveloper(suspendedDeveloper)).toBe(true);
    expect(isSuspended(suspendedDeveloper)).toBe(true);
    // Suspension outranks the type for anything that writes.
    expect(canCreateProjects(suspendedDeveloper)).toBe(false);
  });
});

describe("canReview", () => {
  // Completion is stamped, not inferred: a returned account is past it even
  // though its status has moved on.
  it("requires a completed profile, whatever the status", () => {
    expect(canReview({ status: "draft" })).toBe(false);
    expect(canReview({ status: "completed", profile_completed_at: "2026-08-21 10:00:00" })).toBe(
      true,
    );
    expect(
      canReview({ status: "for_resubmission", profile_completed_at: "2026-08-21 10:00:00" }),
    ).toBe(true);
  });

  it("is refused while suspended, even with a completed profile", () => {
    expect(
      canReview({ status: "suspended", profile_completed_at: "2026-08-21 10:00:00" }),
    ).toBe(false);
  });
});

// Reviewing an API catalog is a STRICTER bar than reviewing a project: a
// completed citizen may review a project, but only an approved developer may
// review an API. Worth pinning, because the two predicates read similarly at
// a glance and the backend refuses the whole catalog-review surface with 403
// account_pending rather than failing at submit.
describe("canReviewCatalogs", () => {
  const developer = { status: "approved", type: "developer" as const };
  // profile_completed_at, not the status, is what marks a profile complete —
  // canReview reads the timestamp.
  const basic = {
    status: "completed",
    type: "basic" as const,
    profile_completed_at: "2026-08-01 09:00:00",
  };

  it("allows an approved developer", () => {
    expect(canReviewCatalogs(developer)).toBe(true);
  });

  it("refuses a basic account that could still review a project", () => {
    expect(canReviewCatalogs(basic)).toBe(false);
    expect(canReview(basic)).toBe(true);
  });

  it("refuses a suspended developer", () => {
    expect(canReviewCatalogs({ status: "suspended", type: "developer" })).toBe(false);
  });
});

describe("canApplyAsDeveloper", () => {
  // The change that makes completion a real step: a bare draft can no longer
  // submit an application.
  it("allows only completed and for_resubmission", () => {
    expect(canApplyAsDeveloper({ status: "completed" })).toBe(true);
    expect(canApplyAsDeveloper({ status: "for_resubmission" })).toBe(true);
    expect(canApplyAsDeveloper({ status: "draft" })).toBe(false);
    expect(canApplyAsDeveloper({ status: "for_assessment" })).toBe(false);
    expect(canApplyAsDeveloper({ status: "approved" })).toBe(false);
  });
});

describe("canCompleteProfile / canEditProfile", () => {
  it("completes only from draft", () => {
    expect(canCompleteProfile({ status: "draft" })).toBe(true);
    expect(canCompleteProfile({ status: "completed" })).toBe(false);
  });

  it("freezes a suspended account read-only", () => {
    expect(canEditProfile({ status: "completed" })).toBe(true);
    expect(canEditProfile({ status: "suspended" })).toBe(false);
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
    expect(accountStatusCopy({ status: "completed" })?.nextStep).toContain("Apply as a developer");
  });

  // Nothing for them to do while it sits in the queue; inventing a step would
  // only invite pointless resubmissions.
  it("gives no next step when the move belongs to somebody else", () => {
    expect(accountStatusCopy({ status: "for_assessment" })?.nextStep).toBeNull();
    expect(accountStatusCopy({ status: "suspended" })?.tone).toBe("frozen");
  });

  it("returns nothing for an unrecognised status", () => {
    expect(accountStatusCopy({ status: "rejected" })).toBeNull();
  });
});

describe("parseRemarks", () => {
  const HISTORY = [
    "[Suspended 2026-08-19] repeated abuse reports",
    "[Returned 2026-08-15] the address doesn't match your ID",
    "an older untagged note",
  ].join("\n");

  it("splits the history newest first, keeping tag and date apart from the body", () => {
    const entries = parseRemarks(HISTORY);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({
      tag: "Suspended",
      date: "2026-08-19",
      body: "repeated abuse reports",
    });
  });

  // Older remarks predate the tagging; dropping them would lose history.
  it("keeps an untagged line rather than discarding it", () => {
    expect(parseRemarks(HISTORY)[2]).toEqual({
      tag: null,
      date: null,
      body: "an older untagged note",
    });
  });

  it("returns nothing for empty remarks", () => {
    expect(parseRemarks(null)).toEqual([]);
    expect(parseRemarks("   ")).toEqual([]);
  });
});

describe("suspensionReason", () => {
  // There is no reason field: it is the newest [Suspended …] line.
  it("finds the newest suspension line", () => {
    const reason = suspensionReason(
      "[Suspended 2026-08-19] repeated abuse reports\n[Suspended 2026-01-02] an older one",
    );
    expect(reason?.body).toBe("repeated abuse reports");
    expect(reason?.date).toBe("2026-08-19");
  });

  it("returns nothing when the account was never suspended", () => {
    expect(suspensionReason("[Returned 2026-08-15] fix your address")).toBeNull();
  });
});

// Regression: saving profile details does NOT change status — only
// POST /profile/complete does. A draft therefore stays a draft across a save,
// which is what made a "redirect draft accounts away from /dashboard/profile"
// guard bounce the user straight back out of the page they had just saved on.
//
// The guard is gone; this pins the property that made it wrong, so nothing
// reintroduces a status-based redirect around the edit flow.
describe("a draft stays a draft across a details save", () => {
  it("keeps every capability decision stable when only details change", () => {
    const before = { status: "draft", type: "basic" as const };
    // PUT /profile returns the same status and no profile_completed_at.
    const after = { status: "draft", type: "basic" as const, first_name: "Mariel" };

    expect(accountStatus(after.status)).toBe(accountStatus(before.status));
    // Still incomplete, so still no reviewing and still able to complete.
    expect(hasCompletedProfile(after)).toBe(false);
    expect(canReview(after)).toBe(false);
    expect(canCompleteProfile(after)).toBe(true);
    // And still not eligible to apply — completion is the gate, not saving.
    expect(canApplyAsDeveloper(after)).toBe(false);
  });
});

// describeNextStep is what the chat assistant reads out, and what the
// dashboard panel echoes — one derivation so the two can't describe the same
// account differently.
describe("describeNextStep", () => {
  it("names the one thing that unlocks something, per state", () => {
    expect(describeNextStep({ status: "draft" })).toContain("mark it complete");
    expect(describeNextStep({ status: "completed" })).toContain("Apply as a developer");
    expect(describeNextStep({ status: "for_resubmission" })).toContain("submit your application");
  });

  // Nothing for them to do: the move belongs to a reviewer, or the account is
  // already where it is going. Inventing a step here would send people to
  // resubmit things that are already in the queue.
  it("gives nothing when the next move isn't theirs", () => {
    expect(describeNextStep({ status: "for_assessment" })).toBeNull();
    expect(describeNextStep({ status: "approved" })).toBeNull();
  });

  it("gives nothing while suspended, whatever the underlying status", () => {
    expect(describeNextStep({ status: "suspended" })).toBeNull();
    // A suspended account that had been mid-application must not be told to
    // resubmit — suspension outranks it.
    expect(
      describeNextStep({ status: "suspended", type: "developer", profile_completed_at: "x" }),
    ).toBeNull();
  });

  it("gives nothing for a status it doesn't recognise", () => {
    expect(describeNextStep({ status: "rejected" })).toBeNull();
  });

  // The `developer_applications` feature flag. Only the
  // server can read it, so it arrives as an argument — and both states that
  // would otherwise be sent to submit have to stop saying so, or the chat
  // assistant points people at a button the dashboard no longer renders and
  // an endpoint that answers 400 applications_closed.
  describe("while developer applications are closed", () => {
    const closed = { applicationsOpen: false };

    it("stops telling a completed account to apply", () => {
      const step = describeNextStep({ status: "completed" }, closed);
      expect(step).not.toContain("Apply as a developer");
      expect(step).toContain("closed");
    });

    it("stops telling a returned application to resubmit", () => {
      const step = describeNextStep({ status: "for_resubmission" }, closed);
      expect(step).not.toContain("submit your application");
      expect(step).toContain("closed");
    });

    // The switch is about applying, not about the rest of the account: an
    // unfinished profile still needs finishing, and completing it still
    // unlocks reviewing.
    it("leaves the states that aren't about applying alone", () => {
      expect(describeNextStep({ status: "draft" }, closed)).toContain("mark it complete");
      expect(describeNextStep({ status: "for_assessment" }, closed)).toBeNull();
      expect(describeNextStep({ status: "approved" }, closed)).toBeNull();
      expect(describeNextStep({ status: "suspended" }, closed)).toBeNull();
    });

    // Omitting the option must mean "open" — every existing caller passes
    // nothing, and defaulting the other way would silently close applications
    // everywhere the flag wasn't threaded through.
    it("defaults to open", () => {
      expect(describeNextStep({ status: "completed" })).toEqual(
        describeNextStep({ status: "completed" }, { applicationsOpen: true }),
      );
    });
  });
});
