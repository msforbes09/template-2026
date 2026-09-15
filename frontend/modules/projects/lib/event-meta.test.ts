import { describe, it, expect } from "vitest";
import { eventMetaEntries } from "@/modules/projects/lib/event-meta";

describe("eventMetaEntries", () => {
  it("surfaces the extras the handoff names, humanised", () => {
    expect(eventMetaEntries({ venue: "PICC", prize_pool: "PHP 1,000,000" })).toEqual([
      { key: "venue", label: "Venue", value: "PICC", href: null },
      { key: "prize_pool", label: "Prize pool", value: "PHP 1,000,000", href: null },
    ]);
  });

  it("returns nothing for a null or empty bag", () => {
    expect(eventMetaEntries(null)).toEqual([]);
    expect(eventMetaEntries({})).toEqual([]);
  });

  it("skips keys the UI already renders elsewhere", () => {
    // criteria_route is the "How entries are judged" button; showing it here
    // too would print the same thing twice.
    expect(eventMetaEntries({ criteria_route: "/egov-hackathon-2026-criteria" })).toEqual([]);
  });

  it("marks an http(s) value as a link and leaves other text alone", () => {
    const [link, plain] = eventMetaEntries({
      register: "https://example.gov.ph/register",
      venue: "PICC",
    });
    expect(link.href).toBe("https://example.gov.ph/register");
    expect(plain.href).toBeNull();
  });

  it("does not make a link out of a non-http scheme", () => {
    expect(eventMetaEntries({ contact: "mailto:x@example.gov.ph" })[0].href).toBeNull();
    expect(eventMetaEntries({ x: "javascript:alert(1)" })[0].href).toBeNull();
  });

  it("renders numbers and booleans, and drops structures", () => {
    // An object has no single sensible rendering, and stringifying one would
    // print "[object Object]" at a visitor.
    expect(
      eventMetaEntries({
        teams: 120,
        streamed: true,
        sponsors: [{ name: "A" }],
        nested: { a: 1 },
        nothing: null,
      }).map((e) => [e.label, e.value]),
    ).toEqual([
      ["Teams", "120"],
      ["Streamed", "Yes"],
    ]);
  });

  it("drops blank and whitespace-only values", () => {
    expect(eventMetaEntries({ venue: "   ", prize: "" })).toEqual([]);
  });

  it("caps the list so a banner cannot become a data dump", () => {
    const big = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`key_${i}`, `value ${i}`]),
    );
    expect(eventMetaEntries(big)).toHaveLength(6);
  });

  it("keeps casing inside a key rather than lowercasing it", () => {
    expect(eventMetaEntries({ eGov_partner: "DICT" })[0].label).toBe("EGov partner");
  });
});
