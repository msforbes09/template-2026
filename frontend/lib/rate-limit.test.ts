import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

// Fake timers throughout: the limiter reads Date.now() and the whole point is
// what happens at a window boundary, which real time can't test in 200ms.
//
// The buckets are module state shared across tests, so every case uses its own
// key rather than resetting between them.
describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows an anonymous caller up to 10 turns in a window", () => {
    for (let turn = 1; turn <= 10; turn += 1) {
      expect(checkRateLimit("anon-basic", { signedIn: false }).ok).toBe(true);
    }
    expect(checkRateLimit("anon-basic", { signedIn: false }).ok).toBe(false);
  });

  it("allows a signed-in caller three times as many", () => {
    for (let turn = 1; turn <= 30; turn += 1) {
      expect(checkRateLimit("member-basic", { signedIn: true }).ok).toBe(true);
    }
    expect(checkRateLimit("member-basic", { signedIn: true }).ok).toBe(false);
  });

  it("reports how long until the window resets", () => {
    for (let turn = 1; turn <= 10; turn += 1) checkRateLimit("anon-retry", { signedIn: false });
    vi.advanceTimersByTime(25_000);

    const result = checkRateLimit("anon-retry", { signedIn: false });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // 60s window, 25s elapsed — the caller is told 35, not a fixed guess.
      expect(result.retryAfterSeconds).toBe(35);
    }
  });

  it("lets the caller through again once the window has passed", () => {
    for (let turn = 1; turn <= 10; turn += 1) checkRateLimit("anon-window", { signedIn: false });
    expect(checkRateLimit("anon-window", { signedIn: false }).ok).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit("anon-window", { signedIn: false }).ok).toBe(true);
  });

  it("keeps separate budgets per key", () => {
    for (let turn = 1; turn <= 10; turn += 1) checkRateLimit("anon-a", { signedIn: false });
    expect(checkRateLimit("anon-a", { signedIn: false }).ok).toBe(false);
    expect(checkRateLimit("anon-b", { signedIn: false }).ok).toBe(true);
  });

  it("does not carry a signed-out budget into a signed-in one for the same key", () => {
    // Keys differ in practice (session id vs IP), but the limit is read per
    // call, so a caller that signs in mid-window gets the higher ceiling
    // against the same bucket rather than staying capped at 10.
    for (let turn = 1; turn <= 10; turn += 1) checkRateLimit("upgrade", { signedIn: false });
    expect(checkRateLimit("upgrade", { signedIn: false }).ok).toBe(false);
    expect(checkRateLimit("upgrade", { signedIn: true }).ok).toBe(true);
  });
});
