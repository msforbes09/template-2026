import { describe, expect, it } from "vitest";
import { isMaintenanceError } from "@/lib/maintenance";

// The second of the handoff's two maintenance signals, and the one that works
// without a successful read of anything.
describe("isMaintenanceError", () => {
  const maintenance = Object.assign(new Error("down for maintenance"), {
    status: 503,
    message: "The service is temporarily down for maintenance. Please try again later.",
    errors: {},
    code: "service_unavailable",
  });

  it("recognises the backend's maintenance envelope", () => {
    expect(isMaintenanceError(maintenance)).toBe(true);
  });

  it("does not claim maintenance for a bare 503", () => {
    // A 503 without the slug is a proxy or a cold container. Putting a
    // reassuring "scheduled maintenance" page in front of a real outage would
    // hide it from the people who need to see it.
    expect(isMaintenanceError({ ...maintenance, code: undefined })).toBe(false);
    expect(isMaintenanceError({ ...maintenance, code: "upstream_unavailable" })).toBe(false);
  });

  it("does not fire on other statuses carrying the same slug", () => {
    expect(isMaintenanceError({ ...maintenance, status: 500 })).toBe(false);
    expect(isMaintenanceError({ ...maintenance, status: 200 })).toBe(false);
  });

  it("is safe on anything that is not an api error", () => {
    for (const value of [null, undefined, "503", new Error("boom"), {}, 503]) {
      expect(isMaintenanceError(value)).toBe(false);
    }
  });
});
