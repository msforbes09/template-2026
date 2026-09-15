import { describe, expect, it } from "vitest";
import {
  canSubmitProject,
  editResetsReview,
  isClaimable,
  isLockedByAssessment,
  projectStatusLabel,
  listTimestampColumn,
} from "@/modules/projects/lib/project-status";
import type { ProjectStatus } from "@/types/project";

describe("projectStatusLabel", () => {
  it("distinguishes a draft that has never been published from one with a live snapshot", () => {
    expect(projectStatusLabel("draft", 0).label).toBe("Draft");
    expect(projectStatusLabel("draft", 1).label).toBe("Draft · Live");
  });

  it("keeps the review state but flags the live snapshot alongside it", () => {
    expect(projectStatusLabel("for_assessment", 0).label).toBe("For Review");
    expect(projectStatusLabel("for_assessment", 1).label).toBe("For Review · Live");
    expect(projectStatusLabel("for_resubmission", 1).label).toBe("Needs Changes · Live");
    expect(projectStatusLabel("for_publishing", 1).label).toBe("Ready to Publish · Live");
  });

  it("reports isLive from is_published, not from the status", () => {
    expect(projectStatusLabel("draft", 1).isLive).toBe(true);
    expect(projectStatusLabel("for_publishing", 0).isLive).toBe(false);
    expect(projectStatusLabel("published", 1).isLive).toBe(true);
  });

  // toggle-publish flips is_published alone now and never moves status, so an
  // approved-but-hidden project is a normal pair rather than an impossible one.
  it("distinguishes an approved project that has been hidden from a live one", () => {
    expect(projectStatusLabel("published", 1).label).toBe("Live");
    expect(projectStatusLabel("published", 0).label).toBe("Hidden");
    expect(projectStatusLabel("published", 0).isLive).toBe(false);
  });

  it("returns a label, tone and description for every status", () => {
    const statuses: ProjectStatus[] = [
      "draft",
      "for_assessment",
      "for_resubmission",
      "for_publishing",
      "published",
    ];
    for (const status of statuses) {
      for (const isPublished of [0, 1] as const) {
        const result = projectStatusLabel(status, isPublished);
        expect(result.label).toBeTruthy();
        expect(result.description).toBeTruthy();
        expect(["draft", "review", "changes", "live"]).toContain(result.tone);
      }
    }
  });
});

describe("canSubmitProject", () => {
  it("allows only the two lanes the API accepts", () => {
    expect(canSubmitProject("draft")).toBe(true);
    expect(canSubmitProject("for_resubmission")).toBe(true);
    expect(canSubmitProject("for_assessment")).toBe(false);
    expect(canSubmitProject("for_publishing")).toBe(false);
    expect(canSubmitProject("published")).toBe(false);
  });
});

describe("editResetsReview", () => {
  it("warns when editing would pull the project out of a queue or behind a live version", () => {
    expect(editResetsReview("for_assessment", 0)).toBe(true);
    expect(editResetsReview("for_publishing", 0)).toBe(true);
    expect(editResetsReview("draft", 1)).toBe(true);
    expect(editResetsReview("draft", 0)).toBe(false);
    expect(editResetsReview("for_resubmission", 0)).toBe(false);
  });
});


describe("isLockedByAssessment", () => {
  it("locks the owner out only while an administrator holds the claim", () => {
    expect(isLockedByAssessment({ is_assessment_started: 1 })).toBe(true);
    expect(isLockedByAssessment({ is_assessment_started: 0 })).toBe(false);
  });

  // An older API omits the flag; that must read as "not locked" rather than
  // disabling every control.
  it("treats an absent flag as unlocked", () => {
    expect(isLockedByAssessment({})).toBe(false);
  });
});

describe("isClaimable", () => {
  it("allows the three admin lanes, including a live project needing a correction", () => {
    expect(isClaimable("for_assessment")).toBe(true);
    expect(isClaimable("for_publishing")).toBe(true);
    expect(isClaimable("published")).toBe(true);
  });

  it("refuses the two that belong to the citizen", () => {
    expect(isClaimable("draft")).toBe(false);
    expect(isClaimable("for_resubmission")).toBe(false);
  });
});

// The admin list shows ONE adaptive timestamp column (the console-wide rule):
// the Published submenu shows when each entry went live, every other view —
// including the unfiltered list — shows the last edit.
describe("listTimestampColumn", () => {
  it("shows published_at on the Published submenu", () => {
    expect(listTimestampColumn("published")).toEqual({ header: "Published", field: "published_at" });
  });

  it("shows updated_at everywhere else, the unfiltered list included", () => {
    expect(listTimestampColumn("for_assessment")).toEqual({ header: "Updated", field: "updated_at" });
    expect(listTimestampColumn("")).toEqual({ header: "Updated", field: "updated_at" });
  });
});
