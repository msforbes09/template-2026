import { describe, expect, it } from "vitest";
import { BarChart3, Medal, Tag, Trophy } from "lucide-react";
import {
  mergeEventTags,
  resolveTags,
  tagChipStyle,
  tagIcon,
} from "@/modules/projects/lib/project-tags";
import type { EgovEvent, ProjectTag } from "@/types/project";

const CATALOG: ProjectTag[] = [
  { name: "Mobile", color: "#0EA5E9", icon: "smartphone" },
  { name: "TOP 30", color: "#F59E0B", icon: "trophy" },
];

describe("resolveTags", () => {
  it("joins names against the catalogue, keeping the project's order", () => {
    expect(resolveTags(["TOP 30", "Mobile"], CATALOG)).toEqual([
      { name: "TOP 30", color: "#F59E0B", icon: "trophy" },
      { name: "Mobile", color: "#0EA5E9", icon: "smartphone" },
    ]);
  });

  it("falls back to a neutral chip for a name the catalogue doesn't know", () => {
    expect(resolveTags(["Legacy Tag"], CATALOG)).toEqual([
      { name: "Legacy Tag", color: "#64748B", icon: "tag" },
    ]);
  });

  it("returns nothing for an untagged project", () => {
    expect(resolveTags([], CATALOG)).toEqual([]);
  });
});

describe("tagIcon", () => {
  it("maps known slugs to their lucide component", () => {
    expect(tagIcon("trophy")).toBe(Trophy);
    expect(tagIcon("bar-chart-3")).toBe(BarChart3);
  });

  it("falls back to the generic glyph for an unmapped slug", () => {
    expect(tagIcon("rocket-ship")).toBe(Tag);
  });
});

describe("tagChipStyle", () => {
  it("tints text, surface and border from the catalogue hex", () => {
    const style = tagChipStyle("#F59E0B");
    expect(style.color).toBe("#F59E0B");
    expect(style.backgroundColor).toContain("#F59E0B");
    expect(style.borderColor).toContain("#F59E0B");
  });
});

describe("tagIcon — beyond the explicit map", () => {
  it("resolves a slug the explicit map does not carry", () => {
    // "medal" ships on the live TOP 5 label and was never in the map. Before
    // the registry fallback it rendered as a generic tag.
    expect(tagIcon("medal")).toBe(Medal);
  });

  it("keeps the explicit map's answer where the registry disagrees", () => {
    // The reason the map survives: `bar-chart-3` is a renamed alias that is a
    // named export but is NOT a key in lucide's `icons` registry, so a purely
    // dynamic lookup would downgrade the catalogue's own tag to a generic
    // glyph.
    expect(tagIcon("bar-chart-3")).toBe(BarChart3);
  });

  it("still falls back for a slug nothing knows", () => {
    expect(tagIcon("not-a-real-icon")).toBe(Tag);
    expect(tagIcon("")).toBe(Tag);
  });
});

describe("mergeEventTags", () => {
  const catalog: ProjectTag[] = [
    { name: "Mobile", color: "#111111", icon: "smartphone" },
    { name: "Health", color: "#222222", icon: "heart-pulse" },
  ];
  const event = (custom_tags?: ProjectTag[]) =>
    ({ id: 1, slug: "e", name: "E", description: null, photo: null,
       starts_at: null, ends_at: null, meta: null, custom_tags }) as EgovEvent;

  it("puts the event's own labels in front of the catalogue", () => {
    const merged = mergeEventTags(catalog, event([
      { name: "TOP 30", color: "#F59E0B", icon: "trophy" },
    ]));
    expect(merged.map((t) => t.name)).toEqual(["TOP 30", "Mobile", "Health"]);
  });

  it("returns the catalogue untouched for a project with no event", () => {
    expect(mergeEventTags(catalog, null)).toBe(catalog);
    expect(mergeEventTags(catalog, undefined)).toBe(catalog);
  });

  it("returns the catalogue untouched when the event curates nothing", () => {
    expect(mergeEventTags(catalog, event([]))).toBe(catalog);
    // A payload from before custom_tags shipped means the same thing.
    expect(mergeEventTags(catalog, event(undefined))).toBe(catalog);
  });

  it("lets the event win a name collision", () => {
    // The event is the more specific source, and the set the backend
    // validates a tag assignment against.
    const merged = mergeEventTags(catalog, event([
      { name: "Mobile", color: "#FF0000", icon: "trophy" },
    ]));
    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual({ name: "Mobile", color: "#FF0000", icon: "trophy" });
    expect(merged.filter((t) => t.name === "Mobile")).toHaveLength(1);
  });

  it("makes a curated name resolve to its colour again", () => {
    // The regression this exists to fix: without the merge, resolveTags gives
    // "TOP 30" the neutral fallback colour because the catalogue dropped it.
    const top30 = { name: "TOP 30", color: "#F59E0B", icon: "trophy" };
    expect(resolveTags(["TOP 30"], catalog)[0].color).toBe("#64748B");
    expect(resolveTags(["TOP 30"], mergeEventTags(catalog, event([top30])))[0]).toEqual(top30);
  });
});
