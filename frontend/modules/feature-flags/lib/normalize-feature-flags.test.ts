import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEATURE_FLAGS,
  normalizeFeatureFlags,
} from "@/modules/feature-flags/lib/normalize-feature-flags";

// The seam between the wire and every gate in the app. Getting a value wrong
// here does not throw — it silently hides a feature, or shows a maintenance
// page over a working site.
describe("normalizeFeatureFlags", () => {
  it("reads the documented 1/0 wire shape", () => {
    expect(
      normalizeFeatureFlags({
        developer_applications: 1,
        project_reviews: 0,
        api_catalog_reviews: 1,
        maintenance_mode: 0,
      }),
    ).toEqual({
      developer_applications: true,
      project_reviews: false,
      api_catalog_reviews: true,
      maintenance_mode: false,
    });
  });

  it("treats 0 as off rather than as a missing value", () => {
    // The trap: `0` is falsy AND absent-looking. A `value ?? default` would
    // turn a deliberate "off" back into the default "on".
    expect(normalizeFeatureFlags({ project_reviews: 0 }).project_reviews).toBe(false);
    expect(normalizeFeatureFlags({ maintenance_mode: 1 }).maintenance_mode).toBe(true);
  });

  it("falls back to the default for a flag the backend stops sending", () => {
    // Absent must NOT read as false. For maintenance_mode that is the
    // difference between a working site and a maintenance page nobody
    // switched on.
    const flags = normalizeFeatureFlags({ project_reviews: 0 });
    expect(flags.maintenance_mode).toBe(false);
    expect(flags.developer_applications).toBe(true);
    expect(flags.api_catalog_reviews).toBe(true);
  });

  it("fails open on junk, so one bad response cannot black out the site", () => {
    for (const junk of [null, undefined, "", 0, [], "not an object"]) {
      expect(normalizeFeatureFlags(junk)).toEqual(DEFAULT_FEATURE_FLAGS);
    }
  });

  it("ignores a flag it does not know about", () => {
    const flags = normalizeFeatureFlags({ some_future_flag: 1, project_reviews: 0 });
    expect(flags).toEqual({ ...DEFAULT_FEATURE_FLAGS, project_reviews: false });
    expect("some_future_flag" in flags).toBe(false);
  });

  it("accepts the booleans and strings a lenient backend might send", () => {
    expect(normalizeFeatureFlags({ project_reviews: true }).project_reviews).toBe(true);
    expect(normalizeFeatureFlags({ project_reviews: false }).project_reviews).toBe(false);
    expect(normalizeFeatureFlags({ project_reviews: "1" }).project_reviews).toBe(true);
    expect(normalizeFeatureFlags({ project_reviews: "0" }).project_reviews).toBe(false);
  });

  it("returns a fresh object, so a caller cannot mutate the defaults", () => {
    const a = normalizeFeatureFlags(null);
    a.maintenance_mode = true;
    expect(normalizeFeatureFlags(null).maintenance_mode).toBe(false);
    expect(DEFAULT_FEATURE_FLAGS.maintenance_mode).toBe(false);
  });
});
