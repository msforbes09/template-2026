import { describe, expect, it } from "vitest";
import { eventCriteriaLink } from "./event-criteria";
import type { EgovEvent } from "@/types/project";

function event(meta: Record<string, unknown> | null): EgovEvent {
  return {
    id: 1,
    slug: "egov-hackathon-2026",
    name: "eGov Hackathon 2026",
    description: null,
    photo: null,
    starts_at: null,
    ends_at: null,
    meta,
  } as EgovEvent;
}

describe("eventCriteriaLink", () => {
  it("reads an internal route from the event's Extras", () => {
    expect(eventCriteriaLink(event({ criteria_route: "/egov-hackathon-2026-criteria" }))).toEqual({
      href: "/egov-hackathon-2026-criteria",
      external: false,
    });
  });

  it("trims surrounding whitespace an admin may paste in", () => {
    expect(eventCriteriaLink(event({ criteria_route: "  /criteria  " }))).toEqual({
      href: "/criteria",
      external: false,
    });
  });

  it("marks an http(s) rubric as external", () => {
    expect(eventCriteriaLink(event({ criteria_route: "https://dict.gov.ph/rubric.pdf" }))).toEqual({
      href: "https://dict.gov.ph/rubric.pdf",
      external: true,
    });
  });

  it("returns null when the event has no Extras at all", () => {
    expect(eventCriteriaLink(event(null))).toBeNull();
  });

  it("returns null when Extras omits the key", () => {
    expect(eventCriteriaLink(event({ venue: "Manila" }))).toBeNull();
  });

  it("returns null for a missing event", () => {
    expect(eventCriteriaLink(null)).toBeNull();
    expect(eventCriteriaLink(undefined)).toBeNull();
  });

  it("ignores a non-string value", () => {
    expect(eventCriteriaLink(event({ criteria_route: 42 }))).toBeNull();
    expect(eventCriteriaLink(event({ criteria_route: ["/a"] }))).toBeNull();
  });

  it("ignores an empty or whitespace-only value", () => {
    expect(eventCriteriaLink(event({ criteria_route: "" }))).toBeNull();
    expect(eventCriteriaLink(event({ criteria_route: "   " }))).toBeNull();
  });

  // The field is admin-entered, public, and used as an href.
  it("rejects javascript: and data: URLs", () => {
    expect(eventCriteriaLink(event({ criteria_route: "javascript:alert(1)" }))).toBeNull();
    expect(eventCriteriaLink(event({ criteria_route: "JavaScript:alert(1)" }))).toBeNull();
    expect(eventCriteriaLink(event({ criteria_route: "data:text/html,<script>" }))).toBeNull();
  });

  it("rejects a protocol-relative URL that looks like a path", () => {
    expect(eventCriteriaLink(event({ criteria_route: "//evil.example" }))).toBeNull();
  });

  it("rejects a bare relative path with no leading slash", () => {
    expect(eventCriteriaLink(event({ criteria_route: "criteria" }))).toBeNull();
  });
});
