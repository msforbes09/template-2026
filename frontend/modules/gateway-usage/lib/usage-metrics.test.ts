import { describe, it, expect } from "vitest";
import {
  LATENCY_ALARM_MS,
  LATENCY_P99_ALARM_MS,
  healthVerdict,
  isLatencyCritical,
  latencyPairTone,
  bucketTooltipLabel,
  bucketLabel,
  delta,
  deltaTone,
  formatDelta,
  formatMs,
  formatRate,
  peakCalls,
  niceCeiling,
} from "@/modules/gateway-usage/lib/usage-metrics";
import type { UsageBucket } from "@/types/gateway-usage";

function bucket(over: Partial<UsageBucket> = {}): UsageBucket {
  return {
    bucket: "2026-08-26 13:00",
    from: "2026-08-26 13:00:00",
    to: "2026-08-26 13:59:59",
    calls: 40,
    errors: 2,
    ...over,
  };
}

describe("delta", () => {
  it("computes a signed ratio against the previous window", () => {
    expect(delta(1240, 1100).ratio).toBeCloseTo(0.127, 3);
    expect(delta(1240, 1100).direction).toBe("up");
    expect(delta(900, 1100).direction).toBe("down");
    expect(delta(1100, 1100).direction).toBe("flat");
  });

  it("returns null rather than Infinity when the previous window was zero", () => {
    // Going from no calls to some calls is a start, not a percentage increase.
    expect(delta(50, 0).ratio).toBeNull();
    expect(delta(50, 0).direction).toBe("up");
    expect(delta(0, 0).direction).toBe("flat");
  });

  it("returns null when there is no previous window at all", () => {
    expect(delta(50, null).ratio).toBeNull();
    expect(delta(50, undefined).ratio).toBeNull();
  });
});

describe("deltaTone", () => {
  it("reads the same direction differently per metric", () => {
    // The load-bearing case: more calls is good news, more errors is not.
    expect(deltaTone("up", "more-is-better")).toBe("good");
    expect(deltaTone("up", "less-is-better")).toBe("bad");
    expect(deltaTone("down", "less-is-better")).toBe("good");
    expect(deltaTone("down", "more-is-better")).toBe("bad");
  });

  it("stays neutral when flat or when the metric has no direction", () => {
    expect(deltaTone("flat", "more-is-better")).toBe("flat");
    expect(deltaTone("up", "neutral")).toBe("flat");
  });
});

describe("formatRate", () => {
  it("renders the API's 0..1 fraction as a percentage", () => {
    // Rendering it raw would read as 0.97 calls succeeding.
    expect(formatRate(0.97)).toBe("97.0%");
    expect(formatRate(1)).toBe("100.0%");
    expect(formatRate(0, 0)).toBe("0%");
  });

  it("shows a dash rather than 0% when there is no rate", () => {
    expect(formatRate(null)).toBe("—");
    expect(formatRate(undefined)).toBe("—");
  });
});

describe("formatDelta", () => {
  it("is signed", () => {
    expect(formatDelta(0.05)).toBe("+5%");
    expect(formatDelta(-0.2)).toBe("-20%");
    expect(formatDelta(0)).toBe("0%");
  });

  it("keeps a decimal only for small changes", () => {
    // A 12.7% swing does not need the decimal; a 2.4% one does, or every
    // small movement rounds to the same number and reads as no change.
    expect(formatDelta(0.127)).toBe("+13%");
    expect(formatDelta(0.024)).toBe("+2.4%");
    expect(formatDelta(-0.024)).toBe("-2.4%");
  });

  it("dashes a missing ratio", () => {
    expect(formatDelta(null)).toBe("—");
  });
});

describe("formatMs", () => {
  it("renders milliseconds, and seconds once past a thousand", () => {
    expect(formatMs(210)).toBe("210ms");
    expect(formatMs(1200)).toBe("1.2s");
    expect(formatMs(12_000)).toBe("12s");
  });

  it("dashes a null latency instead of claiming 0ms", () => {
    // Any latency field is null when nothing was timed. "0ms" would claim an
    // instant response where there was no response.
    expect(formatMs(null)).toBe("—");
    expect(formatMs(undefined)).toBe("—");
  });
});

describe("peakCalls", () => {
  it("is the tallest bar", () => {
    expect(peakCalls([bucket({ calls: 10 }), bucket({ calls: 40 })])).toBe(40);
  });

  it("never returns zero, so an all-quiet window divides safely", () => {
    expect(peakCalls([bucket({ calls: 0 }), bucket({ calls: 0 })])).toBe(1);
    expect(peakCalls([])).toBe(1);
  });
});

describe("healthVerdict", () => {
  // The admin by_catalog row: partner rate rides the row itself since the BE
  // folded partner_health in (2026-08-31).
  const catalog = (platform: string, p99: number | null, rate?: number) => ({
    platform,
    latency: { avg: null, p50: null, p95: null, p99 },
    error_rate_5xx: rate,
  });

  it("reports quiet when no partner fails and no tail drags", () => {
    expect(healthVerdict([catalog("emessage", 900, 0.01)])).toEqual({
      latencyAlarms: [],
      partnerAlarms: [],
    });
  });

  it("flags a p99 at or past ten seconds", () => {
    const verdict = healthVerdict([catalog("egov-ai", 18_000), catalog("emessage", 900)]);
    expect(verdict.latencyAlarms).toEqual([{ platform: "egov-ai", p99: 18_000 }]);
  });

  it("flags partners at or above 5% server errors, with the rate", () => {
    const verdict = healthVerdict([catalog("egovchain", 900, 0.19)]);
    expect(verdict.partnerAlarms).toEqual([{ platform: "egovchain", rate: 0.19 }]);
  });

  it("ignores a missing p99, and a citizen row without a partner rate", () => {
    const verdict = healthVerdict([catalog("compass", null)]);
    expect(verdict.latencyAlarms).toEqual([]);
    expect(verdict.partnerAlarms).toEqual([]);
  });
});

describe("isLatencyCritical", () => {
  // The bars step roughly 2x apart, the shape a healthy latency distribution
  // has: a row whose MEDIAN is already seconds is in trouble regardless of its
  // tail, so p50 must not be judged by the tail's bar.
  it("uses a tighter bar the lower the percentile", () => {
    expect(LATENCY_ALARM_MS.p50).toBeLessThan(LATENCY_ALARM_MS.p95);
    expect(LATENCY_ALARM_MS.p95).toBeLessThan(LATENCY_ALARM_MS.p99);
  });

  // The verdict banner alarms on p99 alone. If the table judged p99 by a
  // different number the two would contradict each other on the same screen.
  it("keeps the p99 bar identical to the banner's", () => {
    expect(LATENCY_P99_ALARM_MS).toBe(LATENCY_ALARM_MS.p99);
  });

  it("fires at or past each bar", () => {
    expect(isLatencyCritical("p50", 2_000)).toBe(true);
    expect(isLatencyCritical("p95", 5_000)).toBe(true);
    expect(isLatencyCritical("p99", 10_000)).toBe(true);
  });

  it("stays quiet just under each bar", () => {
    expect(isLatencyCritical("p50", 1_999)).toBe(false);
    expect(isLatencyCritical("p95", 4_999)).toBe(false);
    expect(isLatencyCritical("p99", 9_999)).toBe(false);
  });

  // Real rows from the dashboard: the busiest healthy API sits at 791ms, so a
  // 2s median bar has real headroom and cannot cry wolf on normal traffic.
  it("leaves healthy APIs alone and catches the broken one", () => {
    expect(isLatencyCritical("p50", 791)).toBe(false);
    expect(isLatencyCritical("p95", 2_600)).toBe(false);
    expect(isLatencyCritical("p99", 2_600)).toBe(false);

    expect(isLatencyCritical("p50", 17_000)).toBe(true);
    expect(isLatencyCritical("p95", 10_000)).toBe(true);
  });

  // A dormant row carries nulls; "—" must never render as an alarm.
  it("treats a missing measurement as not critical", () => {
    expect(isLatencyCritical("p50", null)).toBe(false);
    expect(isLatencyCritical("p99", undefined)).toBe(false);
  });
});

describe("latencyPairTone", () => {
  // The partner figure is a SUBSET of the gateway figure, so judging it by the
  // same bar is what makes the pair readable: partner reddens only when the
  // partner itself is past the line, which is the whole diagnostic value —
  // "17s · 17s" says the partner IS the cause, "17s · 120ms" says we are.
  it("judges both halves by the same percentile bar", () => {
    expect(latencyPairTone("p50", 17_000, 17_000)).toEqual({
      gateway: "critical",
      partner: "critical",
    });
  });

  it("leaves a healthy partner muted under a slow gateway", () => {
    expect(latencyPairTone("p50", 17_000, 120)).toEqual({
      gateway: "critical",
      partner: "normal",
    });
  });

  it("keeps both normal below the bar", () => {
    expect(latencyPairTone("p95", 2_600, 2_500)).toEqual({
      gateway: "normal",
      partner: "normal",
    });
  });

  // The citizen table never receives partner timings, and a dormant row has
  // none — there is no second half to tone at all.
  it("reports no partner half when there is no partner figure", () => {
    expect(latencyPairTone("p99", 900, null).partner).toBeNull();
    expect(latencyPairTone("p99", 900, undefined).partner).toBeNull();
  });

  // A partner can be past the bar while the gateway is not: the bars differ per
  // percentile, and rounding sits both near the line. The halves are judged
  // independently rather than the partner inheriting the gateway's verdict.
  it("tones the halves independently", () => {
    expect(latencyPairTone("p99", 9_999, 10_000)).toEqual({
      gateway: "normal",
      partner: "critical",
    });
  });
});

describe("bucketTooltipLabel", () => {
  it("shows the day plus the hour range for hourly buckets", () => {
    expect(
      bucketTooltipLabel(
        bucket({ from: "2026-08-28 13:00:00", to: "2026-08-28 13:59:59" }),
        "hour",
      ),
    ).toBe("2026-08-28 13:00 – 13:59");
  });

  it("shows the plain date for daily buckets", () => {
    expect(
      bucketTooltipLabel(
        bucket({ from: "2026-08-28 00:00:00", to: "2026-08-28 23:59:59" }),
        "day",
      ),
    ).toBe("2026-08-28");
  });

  it("shows the first and last day for weekly buckets", () => {
    expect(
      bucketTooltipLabel(
        bucket({ from: "2026-08-01 00:00:00", to: "2026-08-07 23:59:59" }),
        "week",
      ),
    ).toBe("2026-08-01 – 2026-08-07");
  });

  it("falls back to the API's bucket key when boundaries are missing", () => {
    expect(
      bucketTooltipLabel(bucket({ from: "", to: "", bucket: "2026-W35" }), "week"),
    ).toBe("2026-W35");
  });
});

describe("bucketLabel", () => {
  it("shows the time for hourly buckets", () => {
    expect(bucketLabel(bucket(), "hour")).toBe("13:00");
  });

  it("shows month-day for daily buckets", () => {
    expect(bucketLabel(bucket({ from: "2026-08-26 00:00:00" }), "day")).toBe("08-26");
  });

  it("keeps the API's ISO-week label for weekly buckets", () => {
    // Deriving "week of" from a date is exactly the arithmetic worth not
    // repeating when the API already labelled it.
    expect(bucketLabel(bucket({ bucket: "2026-W35" }), "week")).toBe("2026-W35");
  });

  it("does not parse the timestamp as a Date", () => {
    // The timestamps are Asia/Manila wall-clock. Parsing them in a browser set
    // to another timezone would shift every label by the offset.
    expect(bucketLabel(bucket({ from: "2026-08-26 08:00:00" }), "hour")).toBe("08:00");
  });
});

describe("niceCeiling", () => {
  it("never sits below 10, the chart's minimum height", () => {
    expect(niceCeiling(0)).toBe(10);
    expect(niceCeiling(1)).toBe(10);
    expect(niceCeiling(7)).toBe(10);
    expect(niceCeiling(10)).toBe(10);
  });

  it("climbs the 1-2-5 ladder to the first step holding the peak", () => {
    expect(niceCeiling(11)).toBe(20);
    expect(niceCeiling(20)).toBe(20);
    expect(niceCeiling(21)).toBe(50);
    expect(niceCeiling(60)).toBe(100);
    expect(niceCeiling(150)).toBe(200);
    expect(niceCeiling(300)).toBe(500);
    expect(niceCeiling(800)).toBe(1000);
  });

  it("keeps climbing per decade above 1000", () => {
    expect(niceCeiling(1200)).toBe(2000);
    expect(niceCeiling(3000)).toBe(5000);
    expect(niceCeiling(7000)).toBe(10000);
  });
});
