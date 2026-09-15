import { describe, it, expect } from "vitest";
import {
  buildUsageQuery,
  isValidWindowInput,
  resolveInterval,
  platformFilterHref,
  usageQueryString,
  DEFAULT_USAGE_INTERVAL,
} from "@/modules/gateway-usage/lib/usage-window";

describe("resolveInterval", () => {
  it("accepts the three the API knows", () => {
    expect(resolveInterval("hour")).toBe("hour");
    expect(resolveInterval("day")).toBe("day");
    expect(resolveInterval("week")).toBe("week");
  });

  it("defaults to day for anything else", () => {
    // An invalid interval is a 422, so it never reaches the API. Daily is the
    // FE default (2026-08-31) — dashboards open on the 30-day trend.
    expect(resolveInterval(null)).toBe(DEFAULT_USAGE_INTERVAL);
    expect(resolveInterval("month")).toBe("day");
    expect(resolveInterval("Hour")).toBe("day");
    expect(resolveInterval("")).toBe("day");
  });
});

describe("isValidWindowInput", () => {
  it("requires date-and-time for hour", () => {
    expect(isValidWindowInput("2026-08-25 00:00", "hour")).toBe(true);
    expect(isValidWindowInput("2026-08-25", "hour")).toBe(false);
  });

  it("requires date-only for day and week", () => {
    expect(isValidWindowInput("2026-08-25", "day")).toBe(true);
    expect(isValidWindowInput("2026-08-25", "week")).toBe(true);
    // Sending the hour format to a day window is a 422.
    expect(isValidWindowInput("2026-08-25 00:00", "day")).toBe(false);
  });

  it("rejects near-misses", () => {
    expect(isValidWindowInput("2026-8-5", "day")).toBe(false);
    expect(isValidWindowInput("25-08-2026", "day")).toBe(false);
    expect(isValidWindowInput("2026-08-25T00:00", "hour")).toBe(false);
  });
});

describe("buildUsageQuery", () => {
  it("returns just the interval when no range is given", () => {
    expect(buildUsageQuery({})).toEqual({ interval: "day" });
    expect(buildUsageQuery({ interval: "hour" })).toEqual({ interval: "hour" });
  });

  it("passes a well-formed custom range through", () => {
    expect(
      buildUsageQuery({ interval: "day", from: "2026-08-01", to: "2026-08-20" }),
    ).toEqual({ interval: "day", from: "2026-08-01", to: "2026-08-20" });
  });

  it("drops a half-given range and says why", () => {
    // `from` or `to` alone is a 422 — the pair is required.
    expect(buildUsageQuery({ interval: "day", from: "2026-08-01" })).toEqual({
      interval: "day",
      rejected: "incomplete",
    });
    expect(buildUsageQuery({ interval: "day", to: "2026-08-20" })).toEqual({
      interval: "day",
      rejected: "incomplete",
    });
  });

  it("drops a range in the wrong format for its interval and says why", () => {
    // The trap: a valid-looking date that is wrong for THIS interval.
    expect(
      buildUsageQuery({ interval: "hour", from: "2026-08-25", to: "2026-08-26" }),
    ).toEqual({ interval: "hour", rejected: "format" });

    expect(
      buildUsageQuery({ interval: "day", from: "2026-08-01 00:00", to: "2026-08-20 00:00" }),
    ).toEqual({ interval: "day", rejected: "format" });
  });

  it("keeps the platform filter through every path", () => {
    expect(buildUsageQuery({ platform: "emessage" })).toEqual({
      interval: "day",
      platform: "emessage",
    });
    expect(buildUsageQuery({ platform: "emessage", from: "2026-08-01" })).toEqual({
      interval: "day",
      platform: "emessage",
      rejected: "incomplete",
    });
  });

  it("treats blank strings as absent", () => {
    expect(buildUsageQuery({ from: "  ", to: "  ", platform: "  " })).toEqual({
      interval: "day",
    });
  });
});

describe("usageQueryString", () => {
  it("always sends interval explicitly", () => {
    // The API defaults to hour alone but to DAY alongside from/to — two
    // different defaults, so omitting it would silently change granularity the
    // moment a custom range is added.
    expect(usageQueryString({ interval: "hour" })).toBe("interval=hour");
  });

  it("sends a complete range", () => {
    const qs = usageQueryString({ interval: "day", from: "2026-08-01", to: "2026-08-20" });
    expect(qs).toContain("interval=day");
    expect(qs).toContain("from=2026-08-01");
    expect(qs).toContain("to=2026-08-20");
  });

  it("never sends half a range", () => {
    const qs = usageQueryString({ interval: "day", from: "2026-08-01" });
    expect(qs).toBe("interval=day");
  });

  it("carries extras like the user drill", () => {
    const qs = usageQueryString({ interval: "hour" }, { user_uuid: "abc-123" });
    expect(qs).toContain("user_uuid=abc-123");
  });

  it("drops an empty extra rather than sending a blank param", () => {
    expect(usageQueryString({ interval: "hour" }, { user_uuid: "" })).toBe("interval=hour");
  });

  it("encodes a platform with awkward characters", () => {
    expect(usageQueryString({ interval: "hour", platform: "a b&c" })).toContain(
      "platform=a+b%26c",
    );
  });
});

describe("platformFilterHref", () => {
  it("links the dashboard itself, filtered to the platform, keeping window and drill", () => {
    expect(
      platformFilterHref(
        { interval: "day", from: "2026-08-01", to: "2026-08-20" },
        "emessage",
        "abc-123",
      ),
    ).toBe("/admin?interval=day&from=2026-08-01&to=2026-08-20&platform=emessage&user_uuid=abc-123");
  });

  it("switches an active platform filter rather than stacking", () => {
    expect(platformFilterHref({ interval: "hour", platform: "everify" }, "emessage")).toBe(
      "/admin?interval=hour&platform=emessage",
    );
  });

  it("clears the filter with null, keeping the rest of the scope", () => {
    expect(platformFilterHref({ interval: "hour", platform: "everify" }, null, "abc-123")).toBe(
      "/admin?interval=hour&user_uuid=abc-123",
    );
  });

  it("targets the given base path — the citizen dashboard filters in place too", () => {
    expect(platformFilterHref({ interval: "hour" }, "emessage", undefined, "/dashboard")).toBe(
      "/dashboard?interval=hour&platform=emessage",
    );
  });
});
