import { describe, expect, it } from "vitest";
import {
  EMPTY_EVENT_VALUES,
  egovEventSchema,
  type EgovEventValues,
} from "@/modules/egov-events/schemas/egov-event-schema";

const VALID: EgovEventValues = {
  ...EMPTY_EVENT_VALUES,
  name: "eGov Hackathon 2026",
  starts_at: "2026-09-01 08:00:00",
  ends_at: "2026-09-30 17:00:00",
  photo_uuid: "01931f2e-7b3a-73c4-9a1e-2f6b0c8d4e10",
  meta: '{"venue":"PICC"}',
};

describe("egovEventSchema", () => {
  it("accepts a complete event and a minimal one", () => {
    expect(egovEventSchema.safeParse(VALID).success).toBe(true);
    // Name and cover photo are the only required fields.
    expect(
      egovEventSchema.safeParse({
        ...EMPTY_EVENT_VALUES,
        name: "Next",
        photo_uuid: VALID.photo_uuid,
      }).success,
    ).toBe(true);
  });

  it("requires a cover photo", () => {
    expect(egovEventSchema.safeParse({ ...VALID, photo_uuid: "" }).success).toBe(false);
  });

  it("requires a name", () => {
    expect(egovEventSchema.safeParse({ ...VALID, name: "" }).success).toBe(false);
  });

  // The API takes Y-m-d H:i:s, never ISO-8601.
  it("insists on the API's datetime format", () => {
    expect(egovEventSchema.safeParse({ ...VALID, starts_at: "2026-09-01T08:00:00Z" }).success).toBe(
      false,
    );
    expect(egovEventSchema.safeParse({ ...VALID, starts_at: "01/09/2026" }).success).toBe(false);
    expect(egovEventSchema.safeParse({ ...VALID, starts_at: "" }).success).toBe(true);
  });

  it("refuses an end before the start, the rule the API enforces", () => {
    const result = egovEventSchema.safeParse({
      ...VALID,
      starts_at: "2026-09-30 17:00:00",
      ends_at: "2026-09-01 08:00:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "ends_at")).toBe(true);
    }
  });

  it("accepts an end equal to the start", () => {
    expect(
      egovEventSchema.safeParse({ ...VALID, ends_at: VALID.starts_at }).success,
    ).toBe(true);
  });

  it("only accepts a JSON object for meta", () => {
    expect(egovEventSchema.safeParse({ ...VALID, meta: "" }).success).toBe(true);
    expect(egovEventSchema.safeParse({ ...VALID, meta: "not json" }).success).toBe(false);
    expect(egovEventSchema.safeParse({ ...VALID, meta: "[1,2]" }).success).toBe(false);
    expect(egovEventSchema.safeParse({ ...VALID, meta: '"text"' }).success).toBe(false);
  });
});

describe("egovEventSchema — custom_tags", () => {
  const withTags = (custom_tags: unknown) => ({ ...VALID, custom_tags });
  const TROPHY = { name: "TOP 30", color: "#F59E0B", icon: "trophy" };

  function firstIssue(value: unknown) {
    const result = egovEventSchema.safeParse(value);
    return result.success ? null : result.error.issues[0];
  }

  it("accepts an empty list — that is how a set is cleared", () => {
    expect(egovEventSchema.safeParse(withTags([])).success).toBe(true);
  });

  it("accepts a well-formed label", () => {
    expect(egovEventSchema.safeParse(withTags([TROPHY])).success).toBe(true);
  });

  it("requires a 6-digit hex colour", () => {
    // The backend's rule; catching it here saves a 422 round trip.
    for (const color of ["#F59E0", "F59E0B", "#F59E0BB", "orange", "#GGGGGG"]) {
      expect(egovEventSchema.safeParse(withTags([{ ...TROPHY, color }])).success).toBe(false);
    }
    expect(egovEventSchema.safeParse(withTags([{ ...TROPHY, color: "#f59e0b" }])).success).toBe(true);
  });

  it("requires a lucide-style icon slug", () => {
    for (const icon of ["Trophy", "bar chart", "bar--chart", "-trophy", "trophy-", ""]) {
      expect(egovEventSchema.safeParse(withTags([{ ...TROPHY, icon }])).success).toBe(false);
    }
    for (const icon of ["trophy", "bar-chart-3", "heart-pulse", "a1"]) {
      expect(egovEventSchema.safeParse(withTags([{ ...TROPHY, icon }])).success).toBe(true);
    }
  });

  it("requires a name and caps it at 50", () => {
    expect(egovEventSchema.safeParse(withTags([{ ...TROPHY, name: "" }])).success).toBe(false);
    expect(egovEventSchema.safeParse(withTags([{ ...TROPHY, name: "x".repeat(51) }])).success).toBe(false);
    expect(egovEventSchema.safeParse(withTags([{ ...TROPHY, name: "x".repeat(50) }])).success).toBe(true);
  });

  it("caps the list at 20", () => {
    const many = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ ...TROPHY, name: `Tag ${i}` }));
    expect(egovEventSchema.safeParse(withTags(many(20))).success).toBe(true);
    expect(egovEventSchema.safeParse(withTags(many(21))).success).toBe(false);
  });

  it("rejects duplicate names rather than letting the backend silently drop one", () => {
    // The API collapses duplicates to the first occurrence, which would lose a
    // row the admin typed without saying so.
    const issue = firstIssue(withTags([TROPHY, { ...TROPHY, color: "#EF4444" }]));
    expect(issue?.message).toBe("Two tags share a name");
    expect(issue?.path).toEqual(["custom_tags"]);
  });

  it("treats names differing only by case or spacing as duplicates", () => {
    expect(egovEventSchema.safeParse(withTags([TROPHY, { ...TROPHY, name: " top 30 " }])).success).toBe(false);
  });

  it("reports the failing row's own field path", () => {
    // So applyResultErrors and the field array can put the message on the row
    // that is wrong rather than on the whole list.
    const issue = firstIssue(withTags([TROPHY, { ...TROPHY, name: "TOP 5", color: "nope" }]));
    expect(issue?.path).toEqual(["custom_tags", 1, "color"]);
  });
});
