import { describe, expect, it } from "vitest";
import { projectExcerpt } from "@/modules/projects/lib/project-excerpt";

describe("projectExcerpt", () => {
  it("strips headings, emphasis and links down to prose", () => {
    expect(
      projectExcerpt("# eGov Wallet\n\nPay **government** fees with [one app](https://x.test)."),
    ).toBe("eGov Wallet Pay government fees with one app.");
  });

  it("drops code fences, inline code and images", () => {
    expect(projectExcerpt("```js\nconst a = 1;\n```\n\nUse `npm i` here. ![shot](a.png) Done.")).toBe(
      "Use npm i here. Done.",
    );
  });

  it("flattens lists, quotes and tables", () => {
    expect(projectExcerpt("> Note\n\n- One\n- Two\n\n| a | b |")).toBe("Note One Two a b");
  });

  it("truncates on a word boundary with an ellipsis", () => {
    const result = projectExcerpt("word ".repeat(60), 40);
    expect(result.length).toBeLessThanOrEqual(41);
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toContain("wor…");
  });

  it("leaves a short description untouched", () => {
    expect(projectExcerpt("A short one.")).toBe("A short one.");
  });
});
