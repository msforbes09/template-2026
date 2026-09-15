import { describe, expect, it } from "vitest";
import { humanize } from "@/lib/humanize";

describe("humanize", () => {
  it("turns PascalCase morph names into Title Case words", () => {
    expect(humanize("GatewayCredential")).toBe("Gateway Credential");
    expect(humanize("PermissionGroup")).toBe("Permission Group");
    expect(humanize("Administrator")).toBe("Administrator");
    expect(humanize("User")).toBe("User");
  });

  it("turns snake_case and kebab-case statuses into Title Case words", () => {
    expect(humanize("for_assessment")).toBe("For Assessment");
    expect(humanize("draft")).toBe("Draft");
    expect(humanize("pii-access")).toBe("Pii Access");
    expect(humanize("account_deleted")).toBe("Account Deleted");
  });

  it("keeps well-known acronyms upper-cased", () => {
    expect(humanize("ApiCatalog")).toBe("API Catalog");
    expect(humanize("Otp")).toBe("OTP");
    expect(humanize("api_key")).toBe("API Key");
  });

  it("passes through anything it doesn't recognise untouched", () => {
    expect(humanize("App\\Models\\User")).toBe("App\\Models\\User");
    expect(humanize("Already Spaced")).toBe("Already Spaced");
    expect(humanize("")).toBe("");
  });
});
