import { describe, expect, it } from "vitest";
import {
  breakdownRows,
  breakdownTotal,
  formatRating,
  hasRating,
  ratingAverage,
  ratingCount,
  ratingLabel,
  starFills,
  wasEdited,
} from "@/modules/reviews/lib/rating";

describe("hasRating", () => {
  it("keys off the count, not the average", () => {
    expect(hasRating({ rating_avg: 0, rating_count: 3 })).toBe(true);
    expect(hasRating({ rating_avg: 4.5, rating_count: 0 })).toBe(false);
  });

  // The backend computing these is merged but not deployed; an older API omits
  // them and must read as "no ratings", never as zero stars.
  it("treats an API that omits the fields as unrated", () => {
    expect(hasRating({})).toBe(false);
    expect(ratingCount({})).toBe(0);
    expect(ratingAverage({})).toBe(0);
  });
});

describe("formatRating", () => {
  it("shows one decimal", () => {
    expect(formatRating({ rating_avg: 4.5, rating_count: 2 })).toBe("4.5");
    expect(formatRating({ rating_avg: 5, rating_count: 2 })).toBe("5.0");
  });

  it("rounds the API's two decimals down to one", () => {
    expect(formatRating({ rating_avg: 4.67, rating_count: 3 })).toBe("4.7");
    expect(formatRating({ rating_avg: 4.44, rating_count: 3 })).toBe("4.4");
  });
});

describe("starFills", () => {
  it("fills whole stars for a whole number", () => {
    expect(starFills(4)).toEqual([1, 1, 1, 1, 0]);
  });

  it("half-fills the star a fractional average lands in", () => {
    expect(starFills(4.5)).toEqual([1, 1, 1, 1, 0.5]);
    expect(starFills(2.3)).toEqual([1, 1, 0.3, 0, 0]);
  });

  it("clamps rather than producing a sixth star or a negative width", () => {
    expect(starFills(7)).toEqual([1, 1, 1, 1, 1]);
    expect(starFills(-2)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe("ratingLabel", () => {
  it("names the rating for a screen reader, since the stars are decorative", () => {
    expect(ratingLabel({ rating_avg: 4.5, rating_count: 12 })).toBe(
      "Rated 4.5 out of 5, from 12 reviews",
    );
  });

  it("singularises a lone review and says so when there are none", () => {
    expect(ratingLabel({ rating_avg: 5, rating_count: 1 })).toBe(
      "Rated 5.0 out of 5, from 1 review",
    );
    expect(ratingLabel({ rating_count: 0 })).toBe("No ratings yet");
  });
});

describe("wasEdited", () => {
  // No flag from the API: the rule is updated_at > created_at.
  it("reports an edit only when the timestamps differ", () => {
    expect(wasEdited("2026-08-20 10:12:45", "2026-08-20 10:12:45")).toBe(false);
    expect(wasEdited("2026-08-20 10:12:45", "2026-08-20 11:00:00")).toBe(true);
  });

  it("orders correctly across a day and a year boundary, comparing as strings", () => {
    expect(wasEdited("2026-08-20 23:59:59", "2026-08-21 00:00:00")).toBe(true);
    expect(wasEdited("2026-12-31 23:59:59", "2027-01-01 00:00:01")).toBe(true);
    expect(wasEdited("2026-08-21 00:00:00", "2026-08-20 23:59:59")).toBe(false);
  });

  it("says no when a timestamp is missing rather than guessing", () => {
    expect(wasEdited("", "2026-08-20 10:12:45")).toBe(false);
    expect(wasEdited("2026-08-20 10:12:45", "")).toBe(false);
  });
});

describe("breakdownRows", () => {
  it("orders five down to one, the way the histogram reads", () => {
    const rows = breakdownRows({ "1": 0, "2": 1, "3": 2, "4": 4, "5": 5 });
    expect(rows.map((r) => r.stars)).toEqual([5, 4, 3, 2, 1]);
    expect(rows.map((r) => r.count)).toEqual([5, 4, 2, 1, 0]);
  });

  // Scaled to the most common rating, not the total: otherwise a spread of
  // votes renders as five stubs and reads as "barely reviewed".
  it("scales each bar against the tallest, not the total", () => {
    const rows = breakdownRows({ "1": 0, "2": 0, "3": 0, "4": 5, "5": 10 });
    expect(rows[0].fraction).toBe(1);
    expect(rows[1].fraction).toBe(0.5);
    expect(rows[4].fraction).toBe(0);
  });

  it("survives an unreviewed project and an absent breakdown", () => {
    expect(breakdownRows({ "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }).every((r) => r.fraction === 0)).toBe(true);
    expect(breakdownRows(undefined).map((r) => r.count)).toEqual([0, 0, 0, 0, 0]);
    expect(breakdownTotal(undefined)).toBe(0);
  });

  it("totals the votes", () => {
    expect(breakdownTotal({ "1": 0, "2": 1, "3": 2, "4": 4, "5": 5 })).toBe(12);
  });
});
