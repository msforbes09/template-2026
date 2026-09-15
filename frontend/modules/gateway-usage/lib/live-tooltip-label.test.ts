import { describe, expect, it } from "vitest";
import { liveTooltipLabel } from "@/modules/gateway-usage/lib/live-tooltip-label";

describe("liveTooltipLabel", () => {
  it("names the current second rather than counting zero of them", () => {
    expect(liveTooltipLabel(0)).toBe("This second");
    expect(liveTooltipLabel(-0)).toBe("This second");
  });

  it("rounds a fractional offset to whole seconds", () => {
    // Offsets are fractional by design — that is what makes the trace slide
    // rather than jump a slot per second.
    expect(liveTooltipLabel(-0.4)).toBe("This second");
    expect(liveTooltipLabel(-0.6)).toBe("1s ago");
    expect(liveTooltipLabel(-12.4)).toBe("12s ago");
    expect(liveTooltipLabel(-59.7)).toBe("60s ago");
  });

  it("reads the offset as an age, not a negative number", () => {
    expect(liveTooltipLabel(-30)).toBe("30s ago");
    expect(liveTooltipLabel(-60)).toBe("60s ago");
  });

  // THE REGRESSION. shadcn's ChartTooltipContent hands a numeric axis the
  // series label instead of the axis value, so these exact strings used to
  // reach the formatter and render "NaNs ago" on every hover.
  it("renders nothing for a value that is not an offset", () => {
    expect(liveTooltipLabel("Calls/sec")).toBe("");
    expect(liveTooltipLabel("Errors/sec")).toBe("");
    expect(liveTooltipLabel(undefined)).toBe("");
    expect(liveTooltipLabel(NaN)).toBe("");
    expect(liveTooltipLabel(Infinity)).toBe("");
  });

  // Number(null), Number("") and Number([]) are all 0, so a coercing
  // implementation answers "This second" for values that are not offsets at
  // all — confidently wrong, which is worse than blank.
  it("does not mistake the zero-coercing values for the current second", () => {
    expect(liveTooltipLabel(null)).toBe("");
    expect(liveTooltipLabel("")).toBe("");
    expect(liveTooltipLabel([])).toBe("");
    expect(liveTooltipLabel(false)).toBe("");
    // A numeric string is still not a number off a typed row.
    expect(liveTooltipLabel("-12")).toBe("");
  });

  it("never renders NaN, whatever it is handed", () => {
    const inputs = ["Calls/sec", undefined, null, NaN, {}, [], "", "abc", Infinity, -Infinity];
    for (const input of inputs) {
      expect(liveTooltipLabel(input)).not.toContain("NaN");
    }
  });
});
