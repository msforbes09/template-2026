import { describe, it, expect } from "vitest";
import {
  creditAlertSummary,
  creditWarnings,
  findPool,
  isDaily,
  poolTone,
  usedRatio,
} from "@/modules/gateway-quota/lib/credits";
import type { GatewayCreditPool } from "@/types/gateway-log";

function pool(over: Partial<GatewayCreditPool> = {}): GatewayCreditPool {
  return {
    platform: "everify",
    allowance: 500,
    used: 0,
    remaining: 500,
    period: "lifetime",
    resets_at: null,
    ...over,
  };
}

describe("poolTone", () => {
  it("is empty at zero remaining", () => {
    expect(poolTone(pool({ used: 500, remaining: 0 }))).toBe("empty");
  });

  it("is low at or under 10% remaining", () => {
    expect(poolTone(pool({ used: 450, remaining: 50 }))).toBe("low");
    expect(poolTone(pool({ used: 451, remaining: 49 }))).toBe("low");
  });

  it("is ok above 10%", () => {
    expect(poolTone(pool({ used: 400, remaining: 100 }))).toBe("ok");
  });

  it("treats a zero allowance as exhausted rather than dividing by zero", () => {
    expect(poolTone(pool({ allowance: 0, used: 0, remaining: 0 }))).toBe("empty");
    expect(usedRatio(pool({ allowance: 0, used: 0, remaining: 0 }))).toBe(1);
  });
});

describe("usedRatio", () => {
  it("clamps to 0..1 even if the API over-reports used", () => {
    expect(usedRatio(pool({ used: 600, remaining: 0 }))).toBe(1);
    expect(usedRatio(pool({ used: -5 }))).toBe(0);
    expect(usedRatio(pool({ used: 250, remaining: 250 }))).toBe(0.5);
  });
});

describe("isDaily", () => {
  it("is true only for the daily period", () => {
    expect(isDaily(pool({ period: "daily" }))).toBe(true);
    expect(isDaily(pool({ period: "lifetime" }))).toBe(false);
  });

  it("treats a missing period as lifetime — no reset is the safe reading", () => {
    // The API serialises `period?->value`, so null is reachable. Claiming a
    // reset that never comes would tell a blocked developer to wait forever.
    expect(isDaily(pool({ period: null }))).toBe(false);
  });
});

describe("findPool", () => {
  const credits = [pool({ platform: "emessage" }), pool({ platform: "egovchain" })];

  it("finds by platform slug", () => {
    expect(findPool(credits, "egovchain")?.platform).toBe("egovchain");
  });

  it("returns null for an unknown slug or absent credits", () => {
    expect(findPool(credits, "nope")).toBeNull();
    expect(findPool(undefined, "emessage")).toBeNull();
  });
});

// The dashboard and the developers page both have to answer "is anything
// about to stop working, and what do I do about it?" — so the grouping and
// the sentences live here rather than inside one of the two cards.
describe("creditWarnings", () => {
  it("finds nothing to say when every pool is healthy", () => {
    const warnings = creditWarnings([pool(), pool({ platform: "emessage" })]);

    expect(warnings.exhausted).toEqual([]);
    expect(warnings.low).toEqual([]);
    expect(warnings.any).toBe(false);
  });

  it("separates the exhausted pools from the merely low ones", () => {
    const dead = pool({ platform: "everify", used: 500, remaining: 0 });
    const nearly = pool({ platform: "emessage", used: 450, remaining: 50 });

    const warnings = creditWarnings([dead, nearly, pool({ platform: "egovpay" })]);

    expect(warnings.exhausted).toEqual([dead]);
    expect(warnings.low).toEqual([nearly]);
    expect(warnings.any).toBe(true);
  });

  it("copes with an account that has no pools at all", () => {
    expect(creditWarnings(undefined).any).toBe(false);
    expect(creditWarnings([]).any).toBe(false);
  });
});

describe("creditAlertSummary", () => {
  it("collapses every struggling pool into one line with one action", () => {
    expect(
      creditAlertSummary([
        pool({ platform: "everify", used: 500, remaining: 0 }),
        pool({ platform: "egov-sso", used: 500, remaining: 0 }),
        pool({ platform: "emessage", used: 490, remaining: 10 }),
        pool({ platform: "egovchain", used: 9_900, remaining: 100, allowance: 10_000, period: "daily" }),
        pool({ platform: "egovpay" }),
      ]),
    ).toEqual({
      exhausted: ["everify", "egov-sso"],
      low: ["emessage", "egovchain"],
      action: "Contact support to request more credits — daily allowances reset on their own at midnight.",
    });
  });

  it("drops the daily aside when only lifetime pools struggle", () => {
    expect(creditAlertSummary([pool({ used: 500, remaining: 0 })])).toEqual({
      exhausted: ["everify"],
      low: [],
      action: "Contact support to request more credits.",
    });
  });

  it("skips the support ask when only daily pools struggle", () => {
    expect(
      creditAlertSummary([
        pool({ platform: "egovchain", used: 10_000, remaining: 0, allowance: 10_000, period: "daily" }),
      ]),
    ).toEqual({
      exhausted: ["egovchain"],
      low: [],
      action: "The daily allowance resets on its own at midnight.",
    });
  });

  it("returns null when every pool is healthy", () => {
    expect(creditAlertSummary([pool()])).toBeNull();
    expect(creditAlertSummary(undefined)).toBeNull();
  });
});
