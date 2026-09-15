import { describe, expect, it } from "vitest";
import { confirmPhrase, phraseMatches } from "@/modules/feature-flags/lib/confirm-phrase";

// The phrase an administrator must type before a system control flips —
// stating the action, not just "confirm", so flipping the wrong switch
// requires typing the wrong words.
describe("confirmPhrase", () => {
  it("states the action and the flag", () => {
    expect(confirmPhrase("Maintenance mode", true)).toBe("enable maintenance mode");
    expect(confirmPhrase("Project reviews", false)).toBe("disable project reviews");
  });
});

describe("phraseMatches", () => {
  it("accepts the phrase regardless of case and surrounding spaces", () => {
    expect(phraseMatches("Enable Maintenance Mode", "enable maintenance mode")).toBe(true);
    expect(phraseMatches("  enable maintenance mode  ", "enable maintenance mode")).toBe(true);
  });

  it("rejects anything else, including the opposite action", () => {
    expect(phraseMatches("disable maintenance mode", "enable maintenance mode")).toBe(false);
    expect(phraseMatches("", "enable maintenance mode")).toBe(false);
    expect(phraseMatches("enable maintenance", "enable maintenance mode")).toBe(false);
  });
});
