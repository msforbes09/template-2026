import { describe, expect, it } from "vitest";
import { PLATFORM_TONES, platformTone } from "@/modules/gateway-logs/lib/platform-tone";

describe("platformTone", () => {
  it("is deterministic — the same slug always gets the same tone", () => {
    expect(platformTone("emessage")).toBe(platformTone("emessage"));
    expect(platformTone("egovph")).toBe(platformTone("egovph"));
  });

  it("always returns one of the palette entries", () => {
    for (const slug of ["emessage", "egovph", "philsys", "psa", "dfa-passport", "x"]) {
      expect(PLATFORM_TONES).toContain(platformTone(slug));
    }
  });

  it("spreads different slugs across the palette", () => {
    const tones = new Set(
      ["emessage", "egovph", "philsys", "psa", "dfa-passport", "lto", "bir", "sss"].map(platformTone),
    );
    expect(tones.size).toBeGreaterThan(1);
  });

  it("is case- and whitespace-insensitive", () => {
    expect(platformTone(" Emessage ")).toBe(platformTone("emessage"));
  });
});
