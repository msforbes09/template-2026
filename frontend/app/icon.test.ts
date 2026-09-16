import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The favicon is a static asset outside the token system, so it is pinned to
// the brand hues by hand: the teal tile and the amber notch of the Logo mark.
describe("app/icon.svg", () => {
  const svg = readFileSync(resolve(__dirname, "icon.svg"), "utf8");

  it("carries the teal tile and the amber notch, and none of the inherited blue", () => {
    expect(svg).toContain("#0f766e");
    expect(svg).toContain("#f59e0b");
    expect(svg).not.toMatch(/#1452f0/i);
  });
});
