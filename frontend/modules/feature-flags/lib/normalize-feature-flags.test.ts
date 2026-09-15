import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEATURE_FLAGS,
  normalizeFeatureFlags,
} from "@/modules/feature-flags/lib/normalize-feature-flags";

// The seam between the wire and every gate in the app. Getting a value wrong
// here does not throw — it silently shows a maintenance page over a working
// site, or hides one that was switched on.
describe("normalizeFeatureFlags", () => {
  it("reads the documented 1/0 wire shape", () => {
    expect(normalizeFeatureFlags({ maintenance_mode: 0 })).toEqual({ maintenance_mode: false });
    expect(normalizeFeatureFlags({ maintenance_mode: 1 })).toEqual({ maintenance_mode: true });
  });

  it("falls back to the default for a flag the backend stops sending", () => {
    // Absent must NOT read as true: that is the difference between a working
    // site and a maintenance page nobody switched on.
    expect(normalizeFeatureFlags({}).maintenance_mode).toBe(false);
  });

  it("fails open on junk, so one bad response cannot black out the site", () => {
    for (const junk of [null, undefined, "", 0, [], "not an object"]) {
      expect(normalizeFeatureFlags(junk)).toEqual(DEFAULT_FEATURE_FLAGS);
    }
  });

  it("ignores a flag it does not know about", () => {
    const flags = normalizeFeatureFlags({ some_future_flag: 1, maintenance_mode: 0 });
    expect(flags).toEqual({ maintenance_mode: false });
    expect("some_future_flag" in flags).toBe(false);
  });

  it("knows only maintenance_mode", () => {
    expect(Object.keys(DEFAULT_FEATURE_FLAGS)).toEqual(["maintenance_mode"]);
  });

  it("accepts the booleans and strings a lenient backend might send", () => {
    expect(normalizeFeatureFlags({ maintenance_mode: true }).maintenance_mode).toBe(true);
    expect(normalizeFeatureFlags({ maintenance_mode: false }).maintenance_mode).toBe(false);
    expect(normalizeFeatureFlags({ maintenance_mode: "1" }).maintenance_mode).toBe(true);
    expect(normalizeFeatureFlags({ maintenance_mode: "0" }).maintenance_mode).toBe(false);
  });

  it("returns a fresh object, so a caller cannot mutate the defaults", () => {
    const a = normalizeFeatureFlags(null);
    a.maintenance_mode = true;
    expect(normalizeFeatureFlags(null).maintenance_mode).toBe(false);
    expect(DEFAULT_FEATURE_FLAGS.maintenance_mode).toBe(false);
  });
});
