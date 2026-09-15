import { describe, expect, it } from "vitest";
import {
  CRITERIA,
  MAX_RAW_SCORE,
  MINIMUM_TOTAL_SCORE,
  mandatoryCriteria,
  totalWeight,
} from "@/modules/hackathon/lib/criteria";

// These mirror the workbook's own "Weight Check" and Global Configuration
// rows. This data is transcribed by hand from a spreadsheet, so the checks the
// spreadsheet performs on itself are worth keeping.
describe("criteria configuration", () => {
  it("has weights summing to exactly 100, the workbook's weight check", () => {
    expect(totalWeight()).toBe(100);
  });

  it("carries all six criteria from the sheet", () => {
    expect(CRITERIA).toHaveLength(6);
    expect(CRITERIA.map((c) => c.weight)).toEqual([30, 25, 15, 10, 15, 5]);
  });

  it("marks exactly the two gating criteria as mandatory", () => {
    const mandatory = mandatoryCriteria();
    expect(mandatory.map((c) => c.name)).toEqual([
      "eGov API Integration & Technical Implementation",
      "Live System Demonstration & Functionality",
    ]);
  });

  it("holds every minimum raw score inside the raw scale", () => {
    for (const criterion of CRITERIA) {
      expect(criterion.minimumRawScore).toBeGreaterThan(0);
      expect(criterion.minimumRawScore).toBeLessThanOrEqual(MAX_RAW_SCORE);
    }
  });

  it("sets the qualifying total below the maximum, or nothing could qualify", () => {
    expect(MINIMUM_TOTAL_SCORE).toBeLessThan(totalWeight());
    expect(MINIMUM_TOTAL_SCORE).toBe(70);
  });

  it("gives every criterion a description and a judge guide", () => {
    for (const criterion of CRITERIA) {
      expect(criterion.description.length).toBeGreaterThan(20);
      expect(criterion.judgeGuide.length).toBeGreaterThan(10);
    }
  });
});
