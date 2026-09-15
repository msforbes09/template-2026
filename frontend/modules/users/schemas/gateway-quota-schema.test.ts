import { describe, it, expect } from "vitest";
import { gatewayQuotaSchema } from "@/modules/users/schemas/gateway-quota-schema";

function parse(values: { platform?: string; amount?: string }) {
  return gatewayQuotaSchema.safeParse({ platform: "emessage", amount: "100", ...values });
}

function messageFor(result: ReturnType<typeof parse>, field: string): string | undefined {
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe("gatewayQuotaSchema", () => {
  it("accepts a platform plus a positive multiple of 100, transformed to a number", () => {
    const result = parse({ platform: "egovchain", amount: "1000" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ platform: "egovchain", amount: 1000 });
    }
  });

  it("requires a platform — the body gained it when credits became per-catalog", () => {
    expect(messageFor(parse({ platform: "" }), "platform")).toBe("Choose which API to top up");
    expect(messageFor(parse({ platform: "   " }), "platform")).toBe("Choose which API to top up");
  });

  it("does NOT restrict the platform to a hardcoded list", () => {
    // The frontend has no authoritative partner list; the backend 422s an
    // unknown slug. Rejecting here would break the day a partner is added.
    expect(parse({ platform: "a-brand-new-partner" }).success).toBe(true);
  });

  it("rejects an empty or non-numeric amount with its own message", () => {
    expect(messageFor(parse({ amount: "" }), "amount")).toBe("Enter an amount");
    expect(messageFor(parse({ amount: "abc" }), "amount")).toBe("Enter a whole number of credits");
    // Not silently coerced to 0.
    expect(parse({ amount: "12.5" }).success).toBe(false);
  });

  it("rejects below 100 and non-multiples of 100", () => {
    expect(messageFor(parse({ amount: "50" }), "amount")).toBe("Enter at least 100 credits");
    expect(messageFor(parse({ amount: "150" }), "amount")).toBe(
      "Amount must be a multiple of 100",
    );
  });

  it("trims surrounding whitespace", () => {
    const result = parse({ platform: "  emessage  ", amount: " 200 " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ platform: "emessage", amount: 200 });
  });
});
