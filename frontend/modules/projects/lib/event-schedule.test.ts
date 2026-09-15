import { describe, it, expect } from "vitest";
import { eventDateRange } from "@/modules/projects/lib/event-schedule";
import type { EgovEvent } from "@/types/project";

function event(overrides: Partial<EgovEvent> = {}): EgovEvent {
  return {
    id: 1,
    slug: "egov-hackathon-2026",
    name: "eGov Hackathon 2026",
    description: null,
    photo: null,
    starts_at: null,
    ends_at: null,
    meta: null,
    ...overrides,
  };
}

describe("eventDateRange", () => {
  it("gives the hours for a single-day event", () => {
    // The live shape: a hackathon that opens and closes the same day. The
    // dates alone would not tell an entrant when to turn up.
    expect(
      eventDateRange(
        event({ starts_at: "2026-07-29 08:00:00", ends_at: "2026-07-29 17:00:00" }),
      ),
    ).toBe("29 Jul 2026 · 8:00 AM – 5:00 PM");
  });

  it("gives the days for a multi-day event", () => {
    expect(
      eventDateRange(
        event({ starts_at: "2026-10-01 08:00:00", ends_at: "2026-10-03 17:00:00" }),
      ),
    ).toBe("1 Oct 2026 – 3 Oct 2026");
  });

  it("falls back to the start alone when there is no end", () => {
    expect(eventDateRange(event({ starts_at: "2026-10-01 08:00:00" }))).toBe("1 Oct 2026");
  });

  it("returns null when there is no start, so the caller renders nothing", () => {
    // Both dates are nullable on the type, and a directory entry with neither
    // must not print an empty line or a dash.
    expect(eventDateRange(event())).toBeNull();
    expect(eventDateRange(event({ ends_at: "2026-10-03 17:00:00" }))).toBeNull();
  });

  it("returns null rather than a dash for an unparseable start", () => {
    expect(eventDateRange(event({ starts_at: "not a date" }))).toBeNull();
  });

  it("treats a same-day pair as same-day even across the time boundary", () => {
    // The check slices the date half rather than parsing, so a midnight-to-
    // midnight day cannot be mistaken for a two-day span.
    expect(
      eventDateRange(
        event({ starts_at: "2026-07-29 00:00:00", ends_at: "2026-07-29 23:59:59" }),
      ),
    ).toBe("29 Jul 2026 · 12:00 AM – 11:59 PM");
  });

  it("does not claim a range when the end is unparseable", () => {
    expect(
      eventDateRange(event({ starts_at: "2026-10-01 08:00:00", ends_at: "garbage" })),
    ).toBe("1 Oct 2026");
  });
});
