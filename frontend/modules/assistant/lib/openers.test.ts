import { describe, expect, it } from "vitest";
import { assistantOpener } from "@/modules/assistant/lib/openers";

// The opening message is the only thing a visitor reads before deciding
// whether this is worth talking to, so what matters is that the two audiences
// get genuinely different copy — a signed-out visitor being offered "generate
// credentials" (which they can't do) or a signed-in developer being told how to
// register is the failure this guards.
describe("assistantOpener", () => {
  const text = (pathname: string, signedIn: boolean) => {
    const opener = assistantOpener(pathname, signedIn);
    return [opener.intro, ...opener.topics, ...opener.suggestions].join(" ").toLowerCase();
  };

  it("offers registering and signing in when signed out", () => {
    const copy = text("/", false);
    expect(copy).toContain("register");
    expect(copy).toContain("sign in");
    expect(copy).toContain("faq");
  });

  it("does not offer signed-in-only actions when signed out", () => {
    const copy = text("/", false);
    expect(copy).not.toContain("credential");
    expect(copy).not.toContain("credit");
  });

  it("offers testing, credentials, credits and identity when signed in", () => {
    const copy = text("/dashboard", true);
    expect(copy).toContain("test");
    expect(copy).toContain("credential");
    expect(copy).toContain("credits");
    expect(copy).toContain("signed in as");
  });

  it("mentions the catalog to both audiences", () => {
    expect(text("/", false)).toContain("api catalog");
    expect(text("/dashboard", true)).toContain("api catalog");
  });

  it("swaps the suggestions for API-specific ones on a catalog page", () => {
    const opener = assistantOpener("/api-catalogs/everify", false);
    expect(opener.suggestions).toContain("How do I authenticate with this API?");
    // The intro and topics are about the audience, not the page, so they stay.
    expect(opener.intro).toBe(assistantOpener("/", false).intro);
  });

  it("offers testing this API on a catalog page when signed in", () => {
    const opener = assistantOpener("/dashboard/api-catalogs/everify", true);
    expect(opener.suggestions).toContain("Help me test this API");
  });

  it("keeps the signed-in defaults on the account pages", () => {
    expect(assistantOpener("/dashboard/profile", true).suggestions).toEqual(
      assistantOpener("/dashboard", true).suggestions,
    );
  });
});
