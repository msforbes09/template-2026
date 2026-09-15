import type { GatewayCreditPool, GatewayCredits } from "@/types/gateway-log";

// Reading a per-catalog credit pool. Pure, so the meters, the dashboard band,
// the admin modal and the 429 notice all answer these questions the same way.

// Below this share of the allowance a pool turns amber — enough warning to ask
// for a top-up before calls start failing.
const LOW_CREDIT_RATIO = 0.1;

export type CreditsTone = "empty" | "low" | "ok";

export function usedRatio(pool: GatewayCreditPool): number {
  if (pool.allowance <= 0) return 1;
  return Math.min(1, Math.max(0, pool.used / pool.allowance));
}

export function poolTone(pool: GatewayCreditPool): CreditsTone {
  if (pool.remaining <= 0) return "empty";
  if (pool.remaining / Math.max(pool.allowance, 1) <= LOW_CREDIT_RATIO) return "low";
  return "ok";
}

// A daily pool's `used` returns to zero at midnight, so running out is
// something to wait through. A lifetime pool needs an administrator.
export function isDaily(pool: GatewayCreditPool): boolean {
  return pool.period === "daily";
}

export function findPool(
  credits: GatewayCredits | undefined,
  platform: string,
): GatewayCreditPool | null {
  return credits?.find((pool) => pool.platform === platform) ?? null;
}

// Which pools need saying something about, and in what order of urgency.
// Both the dashboard card and the developers page ask this, so the grouping
// lives here rather than being re-filtered in each of them.
export function creditWarnings(credits: GatewayCredits | undefined): {
  exhausted: GatewayCreditPool[];
  low: GatewayCreditPool[];
  any: boolean;
} {
  const pools = credits ?? [];
  const exhausted = pools.filter((pool) => poolTone(pool) === "empty");
  const low = pools.filter((pool) => poolTone(pool) === "low");
  return { exhausted, low, any: exhausted.length > 0 || low.length > 0 };
}

// The whole alert as ONE line: who is out, who is low, and the single thing
// to do about it. The support ask covers every lifetime pool at once; the
// daily aside appears only when a daily pool is among the strugglers, because
// its fix is waiting, not asking.
export type CreditAlertSummary = {
  exhausted: string[];
  low: string[];
  action: string;
};

export function creditAlertSummary(credits: GatewayCredits | undefined): CreditAlertSummary | null {
  const { exhausted, low, any } = creditWarnings(credits);
  if (!any) return null;

  const struggling = [...exhausted, ...low];
  const daily = struggling.filter((pool) => isDaily(pool));
  const lifetime = struggling.filter((pool) => !isDaily(pool));

  let action: string;
  if (lifetime.length === 0) {
    action =
      daily.length === 1
        ? "The daily allowance resets on its own at midnight."
        : "Daily allowances reset on their own at midnight.";
  } else if (daily.length === 0) {
    action = "Contact support to request more credits.";
  } else {
    action = "Contact support to request more credits — daily allowances reset on their own at midnight.";
  }

  return {
    exhausted: exhausted.map((pool) => pool.platform),
    low: low.map((pool) => pool.platform),
    action,
  };
}

