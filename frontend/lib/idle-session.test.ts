import { describe, expect, it } from "vitest";
import { idleSchedule } from "@/lib/idle-session";

describe("idleSchedule", () => {
  it("warns one warning-length before the server window closes", () => {
    expect(idleSchedule(60, 60)).toEqual({ warnAfterMs: 59 * 60_000, expireAfterMs: 60 * 60_000 });
  });

  it("warns immediately when the window is no longer than the warning", () => {
    expect(idleSchedule(1, 60)).toEqual({ warnAfterMs: 0, expireAfterMs: 60_000 });
    expect(idleSchedule(0.5, 60)).toEqual({ warnAfterMs: 0, expireAfterMs: 30_000 });
  });

  it("is null when the window is unknown or disabled", () => {
    expect(idleSchedule(0, 60)).toBeNull();
    expect(idleSchedule(undefined, 60)).toBeNull();
    expect(idleSchedule(Number.NaN, 60)).toBeNull();
  });
});
