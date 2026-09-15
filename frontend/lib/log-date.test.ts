import { describe, expect, it } from "vitest";
import { formatLogTimestamp, isValidLogDate } from "@/lib/log-date";

describe("isValidLogDate", () => {
  it("accepts YYYY-MM-DD and rejects anything else", () => {
    expect(isValidLogDate("2026-08-18")).toBe(true);
    expect(isValidLogDate("2026-8-18")).toBe(false);
    expect(isValidLogDate("18/08/2026")).toBe(false);
    expect(isValidLogDate("")).toBe(false);
    expect(isValidLogDate(null)).toBe(false);
  });
});

describe("formatLogTimestamp", () => {
  it("renders the API's plain datetime as Y-m-d H:i:s", () => {
    expect(formatLogTimestamp("2026-08-14 10:30:00")).toBe("2026-08-14 10:30:00");
    expect(formatLogTimestamp("2026-08-14 22:05:09")).toBe("2026-08-14 22:05:09");
  });

  it("falls back to an em dash for null, empty and malformed values", () => {
    expect(formatLogTimestamp(null)).toBe("—");
    expect(formatLogTimestamp("")).toBe("—");
    expect(formatLogTimestamp("not a date")).toBe("—");
  });
});
