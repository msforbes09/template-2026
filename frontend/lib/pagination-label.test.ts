import { describe, expect, it } from "vitest";
import { paginationLabel } from "@/lib/pagination-label";
import type { PaginationMeta } from "@/types/pagination";

function meta(over: Partial<PaginationMeta> = {}): PaginationMeta {
  return {
    current_page: 1,
    last_page: 2,
    per_page: 10,
    total: 14,
    from: 1,
    to: 10,
    ...over,
  };
}

describe("paginationLabel — range (the default)", () => {
  it("names the slice of the total on screen", () => {
    expect(paginationLabel(meta())).toBe("1–10 of 14");
  });

  it("says so when there is nothing to page through", () => {
    expect(paginationLabel(meta({ total: 0, from: null, to: null }))).toBe("No results");
  });

  it("takes the caller's noun for the empty case", () => {
    expect(paginationLabel(meta({ total: 0, from: null, to: null }), { noun: "review" })).toBe(
      "No reviews",
    );
  });

  it("formats large numbers with separators", () => {
    expect(paginationLabel(meta({ from: 1001, to: 1010, total: 12345 }))).toBe(
      "1,001–1,010 of 12,345",
    );
  });
});

// Position mode exists because a range cannot always be told truthfully. On a
// review thread the reader's own review is lifted out and pinned above the
// list, so the rows on screen no longer sit at the offsets the API reported —
// and nothing in the payload says whether the lifted row came from before or
// after this page. `total` is the one number that stays correct, so this mode
// prints only what it can stand behind. See TODO item 26.
describe("paginationLabel — position", () => {
  it("gives the page and the total, never an offset", () => {
    expect(paginationLabel(meta({ current_page: 2, last_page: 2 }), { mode: "position" })).toBe(
      "Page 2 of 2 · 14 results",
    );
  });

  it("uses the caller's noun", () => {
    expect(
      paginationLabel(meta({ current_page: 2, last_page: 2 }), {
        mode: "position",
        noun: "review",
      }),
    ).toBe("Page 2 of 2 · 14 reviews");
  });

  it("keeps the noun singular for exactly one", () => {
    expect(
      paginationLabel(meta({ last_page: 1, total: 1, to: 1 }), {
        mode: "position",
        noun: "review",
      }),
    ).toBe("Page 1 of 1 · 1 review");
  });

  it("says so when there is nothing to page through", () => {
    expect(
      paginationLabel(meta({ total: 0, from: null, to: null, last_page: 1 }), {
        mode: "position",
        noun: "review",
      }),
    ).toBe("No reviews");
  });

  it("never contradicts itself once a row has been lifted out", () => {
    // The exact case that produced "11–15 of 14": page 2 of a 15-row thread
    // with the reader's own review pinned above, so `total` is 14 but the
    // API's own offsets still read 11–15.
    const label = paginationLabel(meta({ current_page: 2, last_page: 2, from: 11, to: 15 }), {
      mode: "position",
      noun: "review",
    });

    expect(label).toBe("Page 2 of 2 · 14 reviews");
    expect(label).not.toContain("15");
  });
});
