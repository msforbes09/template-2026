import { describe, it, expect } from "vitest";
import {
  buildBins,
  isErrorStatus,
  matchesScope,
  LIVE_WINDOW_SECONDS,
} from "@/modules/gateway-usage/lib/use-live-usage-rate";

// Deliberately NOT on a second boundary: the fractional remainder is what
// slides the trace, so every offset assertion below exercises it.
const NOW = 1_700_000_000_000 + 400;
const secondsAgo = (n: number) => NOW - n * 1000;

describe("buildBins", () => {
  it("covers the whole window even with nothing to show", () => {
    // The trace must be a flat line, not an empty plot — a quiet minute is
    // information, and a chart that collapses to nothing looks broken.
    const bins = buildBins([], NOW);
    expect(bins).toHaveLength(LIVE_WINDOW_SECONDS + 1);
    expect(bins.every((bin) => bin.calls === 0 && bin.errors === 0)).toBe(true);
  });

  it("runs left to right, oldest to newest, entirely in the past", () => {
    const bins = buildBins([], NOW);
    expect(bins[0].offset).toBeLessThan(bins.at(-1)!.offset);
    // A positive offset would place a bin in the future.
    expect(bins.every((b) => b.offset <= 0)).toBe(true);
    expect(bins[0].offset).toBeGreaterThanOrEqual(-(LIVE_WINDOW_SECONDS + 1));
  });

  it("slides: a fixed call's offset decreases as now advances", () => {
    // This is the motion. Offsets are fractional, so between whole seconds the
    // trace still moves — it does not wait for a boundary to jump.
    const arrival = [{ at: NOW, error: false }];
    const offsetOf = (now: number) => buildBins(arrival, now).find((b) => b.calls === 1)!.offset;

    expect(offsetOf(NOW + 250)).toBeLessThan(offsetOf(NOW));
    // And by exactly the elapsed time, not a whole slot.
    expect(offsetOf(NOW) - offsetOf(NOW + 250)).toBeCloseTo(0.25, 5);
  });

  it("keeps a call in the SAME absolute second while it slides", () => {
    // Bins are anchored to wall-clock seconds; only the window moves over
    // them. The axis handles the overflow (allowDataOverflow), so the data is
    // free to slide past the domain edge without dragging the scale.
    const arrival = [{ at: NOW, error: false }];
    expect(buildBins(arrival, NOW).find((b) => b.calls === 1)!.second).toBe(
      buildBins(arrival, NOW + 3000).find((b) => b.calls === 1)!.second,
    );
  });

  it("puts a call that just arrived at the right-hand end, not the left", () => {
    const bins = buildBins([{ at: NOW, error: false }], NOW);
    expect(bins.at(-1)!.calls).toBe(1);
    expect(bins[0].calls).toBe(0);
  });

  it("places an older call further left", () => {
    const bins = buildBins([{ at: secondsAgo(10), error: false }], NOW);
    const bin = bins.find((b) => b.calls === 1)!;
    expect(bin.offset).toBeLessThan(-9);
    expect(bin.offset).toBeGreaterThan(-11);
    // And nowhere else.
    expect(bins.reduce((sum, b) => sum + b.calls, 0)).toBe(1);
  });

  it("counts several arrivals in the same second together", () => {
    const bins = buildBins(
      [
        { at: secondsAgo(5), error: false },
        { at: secondsAgo(5), error: true },
        // Same absolute second as the two above (bins are floor(at/1000)).
        { at: secondsAgo(5) + 100, error: false },
      ],
      NOW,
    );
    const bin = bins.find((b) => b.calls > 0)!;
    expect(bin.calls).toBe(3);
    expect(bin.errors).toBe(1);
  });

  it("splits arrivals that straddle an absolute second boundary", () => {
    // Bins are floor(at / 1000) in wall-clock time, so two calls either side
    // of a boundary land in adjacent bins. Normal, not a rounding bug.
    const bins = buildBins(
      [
        { at: 1_700_000_000_000 - 1, error: false },
        { at: 1_700_000_000_000 + 1, error: false },
      ],
      NOW,
    );
    const occupied = bins.filter((b) => b.calls > 0);
    expect(occupied).toHaveLength(2);
    expect(occupied[1].second - occupied[0].second).toBe(1);
  });

  it("counts an error into BOTH calls and errors", () => {
    // Errors are a subset, exactly as in the historical chart — not a separate
    // population that would make the two charts disagree.
    const bins = buildBins([{ at: NOW, error: true }], NOW);
    expect(bins.at(-1)!.calls).toBe(1);
    expect(bins.at(-1)!.errors).toBe(1);
  });

  it("drops anything older than the window, so the trace scrolls", () => {
    const bins = buildBins([{ at: secondsAgo(LIVE_WINDOW_SECONDS + 5), error: false }], NOW);
    expect(bins.reduce((sum, b) => sum + b.calls, 0)).toBe(0);
  });

  it("keeps a call at the far edge of the window", () => {
    const bins = buildBins([{ at: secondsAgo(LIVE_WINDOW_SECONDS), error: false }], NOW);
    expect(bins.reduce((sum, b) => sum + b.calls, 0)).toBe(1);
  });

  it("ignores a clock that runs backwards rather than writing out of bounds", () => {
    // Arrival timestamped in the future — a clock adjustment mid-session.
    expect(() => buildBins([{ at: NOW + 5000, error: false }], NOW)).not.toThrow();
    expect(
      buildBins([{ at: NOW + 5000, error: false }], NOW).reduce((s, b) => s + b.calls, 0),
    ).toBe(0);
  });
});

describe("isErrorStatus", () => {
  it("treats 4xx and 5xx as errors", () => {
    expect(isErrorStatus(400)).toBe(true);
    expect(isErrorStatus(429)).toBe(true);
    expect(isErrorStatus(500)).toBe(true);
    expect(isErrorStatus("502")).toBe(true);
  });

  it("treats 2xx and 3xx as successful", () => {
    expect(isErrorStatus(200)).toBe(false);
    expect(isErrorStatus(204)).toBe(false);
    expect(isErrorStatus(301)).toBe(false);
    expect(isErrorStatus("200")).toBe(false);
  });

  it("counts a missing or unparseable status as an error", () => {
    // Matches how the API derives `errors` for the historical chart — calls
    // minus 2xx/3xx — so a null status classifies the same way in both.
    expect(isErrorStatus(null)).toBe(true);
    expect(isErrorStatus(undefined)).toBe(true);
    expect(isErrorStatus("")).toBe(true);
    expect(isErrorStatus("nonsense")).toBe(true);
  });
});

describe("matchesScope", () => {
  const log = { platform: "emessage", user_uuid: "u-1" };

  it("accepts everything when no filter is set", () => {
    // Absent means "all", never "none" — the platform-wide admin view sets
    // neither and must still see every call.
    expect(matchesScope(log)).toBe(true);
    expect(matchesScope(log, "", null)).toBe(true);
    expect(matchesScope(log, undefined, undefined)).toBe(true);
  });

  it("filters by platform", () => {
    expect(matchesScope(log, "emessage")).toBe(true);
    expect(matchesScope(log, "egovchain")).toBe(false);
  });

  it("filters by developer — the admin drill", () => {
    // The shared administrators channel carries everyone, so without this a
    // page scoped to one developer would plot the whole platform under them.
    expect(matchesScope(log, "", "u-1")).toBe(true);
    expect(matchesScope(log, "", "u-2")).toBe(false);
  });

  it("requires BOTH when both are set", () => {
    expect(matchesScope(log, "emessage", "u-1")).toBe(true);
    expect(matchesScope(log, "emessage", "u-2")).toBe(false);
    expect(matchesScope(log, "egovchain", "u-1")).toBe(false);
  });

  it("drops an event whose user_uuid is missing while drilled in", () => {
    // Better to under-count than to attribute an unidentified call to the
    // developer whose page is open.
    expect(matchesScope({ platform: "emessage", user_uuid: null }, "", "u-1")).toBe(false);
  });
});
