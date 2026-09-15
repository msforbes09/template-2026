import { describe, expect, test } from "vitest";
import { needsFirstCredential } from "@/modules/gateway-quota/lib/first-credential";

// Whether to lead the developer dashboard with "get your API credentials".
// Reads credentials_count from the profile (egov-api-ws: profile resource).
describe("needsFirstCredential", () => {
  test("true for an approved developer holding no credential", () => {
    expect(needsFirstCredential({ credentials_count: 0 }, true)).toBe(true);
  });

  test("false once they hold one", () => {
    expect(needsFirstCredential({ credentials_count: 1 }, true)).toBe(false);
  });

  // Basic accounts cannot mint a credential at all, so the nudge would be a
  // dead end for them.
  test("false for a non-developer, whatever the count", () => {
    expect(needsFirstCredential({ credentials_count: 0 }, false)).toBe(false);
  });

  // Backend predating the field: say nothing rather than nag someone who may
  // already hold a key.
  test("false when the field is absent", () => {
    expect(needsFirstCredential({}, true)).toBe(false);
  });
});
