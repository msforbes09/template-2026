import { describe, expect, it } from "vitest";
import { isEventActive, isEventPublished } from "./project";
import type { EgovEvent } from "./project";

function event(flags: Partial<EgovEvent> = {}): EgovEvent {
  return {
    id: 1,
    slug: "egov-hackathon-2026",
    name: "eGov Hackathon 2026",
    description: null,
    photo: null,
    starts_at: null,
    ends_at: null,
    meta: null,
    ...flags,
  } as EgovEvent;
}

// The flags arrived on 2026-08-23 and the frontend has to read correctly both
// before and after the backend ships them, so the absent case is the one that
// actually matters here.
describe("isEventActive", () => {
  it("reads the flag when the payload carries it", () => {
    expect(isEventActive(event({ is_active: 1 }))).toBe(true);
    expect(isEventActive(event({ is_active: 0 }))).toBe(false);
  });

  // Pre-change the directory returned active events only, so anything it
  // handed you was active by definition.
  it("treats an absent flag as active", () => {
    expect(isEventActive(event())).toBe(true);
  });
});

describe("isEventPublished", () => {
  it("reads the flag when the payload carries it", () => {
    expect(isEventPublished(event({ is_published: 1 }))).toBe(true);
    expect(isEventPublished(event({ is_published: 0 }))).toBe(false);
  });

  // Pre-change there was no way to hide an event, and the backend column
  // defaults to true.
  it("treats an absent flag as published", () => {
    expect(isEventPublished(event())).toBe(true);
  });
});

describe("the two flags are independent", () => {
  // The distinction the whole change rests on: ending a programme does not
  // withdraw it from the public site, which is what makes past events
  // browsable.
  it("a closed event can still be published", () => {
    const closed = event({ is_active: 0, is_published: 1 });
    expect(isEventActive(closed)).toBe(false);
    expect(isEventPublished(closed)).toBe(true);
  });

  it("an ongoing event can be hidden", () => {
    const hidden = event({ is_active: 1, is_published: 0 });
    expect(isEventActive(hidden)).toBe(true);
    expect(isEventPublished(hidden)).toBe(false);
  });
});
