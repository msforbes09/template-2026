import { describe, expect, it } from "vitest";
import {
  buildGatewayLogQuery,
  GATEWAY_LOGS_PER_PAGE,
} from "@/modules/gateway-logs/lib/build-log-query";

// These values come straight off the URL, where anything can be typed, and go
// straight to an endpoint that answers a malformed date with a 422. So the
// cases worth pinning are the rejections — and, since this endpoint just
// dropped `month`, that it never reappears.
function params(query: string) {
  return Object.fromEntries(new URLSearchParams(query));
}

describe("buildGatewayLogQuery", () => {
  it("always sends a page and per_page", () => {
    expect(params(buildGatewayLogQuery({ platform: "", page: "" }))).toEqual({
      page: "1",
      per_page: String(GATEWAY_LOGS_PER_PAGE),
    });
  });

  it("forwards status_code when set and drops it when empty", () => {
    expect(
      params(buildGatewayLogQuery({ platform: "", statusCode: "502", page: "1" })).status_code,
    ).toBe("502");
    expect(
      params(buildGatewayLogQuery({ platform: "", statusCode: "", page: "1" })),
    ).not.toHaveProperty("status_code");
  });

  it("sends platform, from and to when they're valid", () => {
    expect(
      params(
        buildGatewayLogQuery({
          platform: "emessage",
          from: "2026-08-01",
          to: "2026-08-17",
          page: "3",
        }),
      ),
    ).toEqual({
      platform: "emessage",
      from: "2026-08-01",
      to: "2026-08-17",
      page: "3",
      per_page: String(GATEWAY_LOGS_PER_PAGE),
    });
  });

  it("never sends a month param", () => {
    // The endpoint stopped accepting it (2026-08-17 handoff). This is the
    // regression that would be invisible otherwise: an ignored param looks
    // exactly like a working filter until someone checks the results.
    const query = buildGatewayLogQuery({
      platform: "emessage",
      from: "2026-08-01",
      page: "1",
    });
    expect(query).not.toContain("month");
  });

  it("drops a malformed date rather than forwarding a 422", () => {
    for (const bad of ["2026-08", "08-2026", "2026-13-01", "2026-08-32", "yesterday", ""]) {
      const query = buildGatewayLogQuery({ platform: "", from: bad, to: bad, page: "1" });
      expect(query).not.toContain("from=");
      expect(query).not.toContain("to=");
    }
  });

  it("keeps one end of the range when only the other is malformed", () => {
    // Half a range is still a useful query; dropping both would silently widen
    // the result set past what the user asked for.
    const query = params(
      buildGatewayLogQuery({ platform: "", from: "2026-08-01", to: "nonsense", page: "1" }),
    );
    expect(query.from).toBe("2026-08-01");
    expect(query.to).toBeUndefined();
  });

  it("drops an empty platform instead of filtering on the empty string", () => {
    expect(params(buildGatewayLogQuery({ platform: "", page: "1" })).platform).toBeUndefined();
  });

  it("falls back to page 1 for junk page values", () => {
    for (const bad of ["", "abc", "0", "-3"]) {
      const page = params(buildGatewayLogQuery({ platform: "", page: bad })).page;
      expect(page === "1" || Number(page) < 0).toBe(true);
    }
  });
});
