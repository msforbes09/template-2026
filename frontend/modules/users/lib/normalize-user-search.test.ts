import { describe, expect, it } from "vitest";
import { normalizeUserSearch } from "@/modules/users/lib/normalize-user-search";

// Mobile numbers are stored canonically as +639XXXXXXXXX and the WS search is
// an exact blind-index match — so every obvious way an admin types a PH
// mobile must normalize to that form, and everything else must pass through
// untouched.
describe("normalizeUserSearch", () => {
  it("normalizes the common PH mobile spellings to +639XXXXXXXXX", () => {
    expect(normalizeUserSearch("09171234567")).toBe("+639171234567");
    expect(normalizeUserSearch("9171234567")).toBe("+639171234567");
    expect(normalizeUserSearch("639171234567")).toBe("+639171234567");
    expect(normalizeUserSearch("+639171234567")).toBe("+639171234567");
  });

  it("forgives spaces, dashes and dots inside a mobile", () => {
    expect(normalizeUserSearch("0917 123 4567")).toBe("+639171234567");
    expect(normalizeUserSearch("0917-123-4567")).toBe("+639171234567");
    expect(normalizeUserSearch("+63 917.123.4567")).toBe("+639171234567");
  });

  it("leaves names, emails and non-mobile numbers untouched", () => {
    expect(normalizeUserSearch("Juan Cruz")).toBe("Juan Cruz");
    expect(normalizeUserSearch("juan@example.com")).toBe("juan@example.com");
    // A landline or partial number is not a PH mobile — pass through.
    expect(normalizeUserSearch("87001234")).toBe("87001234");
    expect(normalizeUserSearch("0917123")).toBe("0917123");
  });
});
