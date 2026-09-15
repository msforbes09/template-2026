import { describe, expect, it } from "vitest";
import { catalogSpans, sortCatalogs } from "@/modules/api-catalog/lib/catalog-grid";

// The section renders whatever the API publishes, so the count is not ours to
// choose. These check the two things that used to be guaranteed by hand: that
// the grid ends flush, and that the flagships stay at the top.
describe("catalogSpans", () => {
  const columns = (spans: string[]) =>
    spans.reduce((total, span) => total + (span === "lg:col-span-4" ? 4 : 3), 0);

  it("gives one span per card", () => {
    for (let count = 0; count <= 24; count++) {
      expect(catalogSpans(count)).toHaveLength(count);
    }
  });

  it("fills whole 12-column rows for every count it can tile", () => {
    // 1, 2 and 5 cannot be made from rows of three and four; everything else
    // must come out as a multiple of 12 columns, i.e. no short final row.
    const untileable = new Set([1, 2, 5]);
    for (let count = 3; count <= 24; count++) {
      if (untileable.has(count)) continue;
      expect(columns(catalogSpans(count)) % 12).toBe(0);
    }
  });

  it("keeps the original layout at seven catalogs", () => {
    expect(catalogSpans(7)).toEqual([
      "lg:col-span-4",
      "lg:col-span-4",
      "lg:col-span-4",
      "lg:col-span-3",
      "lg:col-span-3",
      "lg:col-span-3",
      "lg:col-span-3",
    ]);
  });

  it("uses three even rows at nine catalogs", () => {
    expect(new Set(catalogSpans(9))).toEqual(new Set(["lg:col-span-4"]));
  });

  it("falls back to wide cards for a count that cannot tile", () => {
    expect(catalogSpans(5)).toEqual(Array(5).fill("lg:col-span-4"));
  });
});

describe("sortCatalogs", () => {
  const ids = (list: { identifier: string }[]) => list.map((item) => item.identifier);

  it("puts the flagships first regardless of API order", () => {
    const sorted = sortCatalogs([
      { identifier: "compass" },
      { identifier: "egovchain" },
      { identifier: "everify" },
      { identifier: "egov-sso" },
    ]);
    expect(ids(sorted)).toEqual(["egov-sso", "everify", "compass", "egovchain"]);
  });

  it("appends unknown catalogs in API order rather than dropping them", () => {
    const sorted = sortCatalogs([
      { identifier: "face-liveness" },
      { identifier: "ereport" },
      { identifier: "egov-sso" },
    ]);
    expect(ids(sorted)).toEqual(["egov-sso", "face-liveness", "ereport"]);
  });

  it("does not mutate its input", () => {
    const input = [{ identifier: "compass" }, { identifier: "egov-sso" }];
    sortCatalogs(input);
    expect(ids(input)).toEqual(["compass", "egov-sso"]);
  });
});
