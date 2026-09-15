import { describe, expect, it } from "vitest";
import { isMissingProjectError } from "@/modules/projects/lib/project-errors";

function apiError(status: number, code?: string) {
  return Object.assign(new Error("boom"), { status, message: "boom", errors: {}, code });
}

describe("isMissingProjectError", () => {
  it("treats a documented 404 as missing", () => {
    expect(isMissingProjectError(apiError(404))).toBe(true);
  });

  it("also treats the API's actual 400 data_processing_failed as missing", () => {
    expect(isMissingProjectError(apiError(400, "data_processing_failed"))).toBe(true);
  });

  it("leaves other failures alone", () => {
    expect(isMissingProjectError(apiError(400, "invalid_status"))).toBe(false);
    expect(isMissingProjectError(apiError(400))).toBe(false);
    expect(isMissingProjectError(apiError(403, "account_pending"))).toBe(false);
    expect(isMissingProjectError(apiError(500))).toBe(false);
  });

  it("ignores anything that isn't an API error", () => {
    expect(isMissingProjectError(new Error("network down"))).toBe(false);
    expect(isMissingProjectError(null)).toBe(false);
  });
});
