import { describe, expect, it } from "vitest";
import { languageLabel, resolveLanguage } from "@/lib/highlight";

// The fence tag comes from the model, so it arrives in whatever form it felt
// like writing — the mapping is the part worth pinning down.
describe("resolveLanguage", () => {
  it("maps the aliases the model actually writes onto a grammar", () => {
    expect(resolveLanguage("curl")).toBe("bash");
    expect(resolveLanguage("sh")).toBe("bash");
    expect(resolveLanguage("js")).toBe("javascript");
    expect(resolveLanguage("ts")).toBe("typescript");
    expect(resolveLanguage("html")).toBe("xml");
    expect(resolveLanguage("yml")).toBe("yaml");
  });

  it("ignores case and a leading dot", () => {
    expect(resolveLanguage("JSON")).toBe("json");
    expect(resolveLanguage(".php")).toBe("php");
  });

  it("returns null rather than guessing for something it can't highlight", () => {
    expect(resolveLanguage("cobol")).toBeNull();
    expect(resolveLanguage(null)).toBeNull();
    expect(resolveLanguage("")).toBeNull();
  });
});

describe("languageLabel", () => {
  it("names the block properly rather than echoing the tag", () => {
    expect(languageLabel("js")).toBe("JavaScript");
    expect(languageLabel("json")).toBe("JSON");
    expect(languageLabel("curl")).toBe("cURL");
    expect(languageLabel("csharp")).toBe("C#");
  });

  it("falls back to what was typed for an unknown language", () => {
    expect(languageLabel("cobol")).toBe("cobol");
  });

  it("has no label without a language", () => {
    expect(languageLabel(null)).toBeNull();
  });
});
