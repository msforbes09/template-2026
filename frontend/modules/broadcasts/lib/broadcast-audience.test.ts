import { describe, it, expect } from "vitest";
import {
  describeAudience,
  isBroadcastStuck,
} from "@/modules/broadcasts/lib/broadcast-audience";

describe("describeAudience", () => {
  it("treats null filters as everyone", () => {
    // `filters: null` on a history row means "all registered users" — the
    // absence of targeting, not an empty selection.
    expect(describeAudience(null)).toMatchObject({
      label: "All registered users",
      isEveryone: true,
    });
  });

  it("treats an empty filter object as everyone too", () => {
    // A draft saved with the targeting cleared comes back as {} rather than
    // null, and it reaches exactly the same people.
    expect(describeAudience({})).toMatchObject({
      label: "All registered users",
      isEveryone: true,
    });
  });

  it("names a status audience", () => {
    expect(describeAudience({ status: "completed" }).label).toBe(
      "All users with a completed profile",
    );
    expect(describeAudience({ status: "draft" }).label).toBe(
      "All users with an incomplete profile",
    );
  });

  it("recognises a single-user broadcast and never calls it everyone", () => {
    const audience = describeAudience({ user_uuid: "9d3f-abc" });
    expect(audience).toMatchObject({
      label: "One user",
      isEveryone: false,
      isSingleUser: true,
      // The uuid is surfaced so an admin reading the history can see WHO the
      // scope was, not just that it was narrow. It is all the payload
      // carries — the API does not resolve a name for the list.
      detail: "9d3f-abc",
    });
  });

  it("carries no detail for the broader audiences", () => {
    expect(describeAudience(null).detail).toBeNull();
    expect(describeAudience({ status: "draft" }).detail).toBeNull();
  });

  it("does not mistake a blank uuid for a single-user target", () => {
    // A cleared input must not silently become "one user (nobody)". It is
    // an absence of targeting, which is everyone — and that difference is the
    // whole reason the Everyone case needs a confirmation.
    expect(describeAudience({ user_uuid: "   " })).toMatchObject({
      label: "All registered users",
      isEveryone: true,
    });
  });

  it("renders an unknown filter value rather than dropping it", () => {
    // The audience line must never understate who is being reached, so an
    // unrecognised value is spelled out instead of ignored.
    const audience = describeAudience({ status: "archived" as never });
    expect(audience.label).toBe("All users with status archived");
    expect(audience.isEveryone).toBe(false);
  });
});

describe("isBroadcastStuck", () => {
  // 2026-08-27 15:20:00 Asia/Manila, parsed the same naive way the helper does.
  const started = "2026-08-27 15:20:00";
  const startedMs = Date.parse("2026-08-27T15:20:00");
  const FIVE_MINUTES = 5 * 60_000;

  it("is not stuck moments after starting", () => {
    expect(isBroadcastStuck(started, "sending", startedMs + 3_000, FIVE_MINUTES)).toBe(false);
  });

  it("is stuck once the fan-out has run far past the threshold", () => {
    expect(isBroadcastStuck(started, "sending", startedMs + 6 * 60_000, FIVE_MINUTES)).toBe(true);
  });

  it("is never stuck in any status but sending", () => {
    const long = startedMs + 60 * 60_000;
    expect(isBroadcastStuck(started, "sent", long, FIVE_MINUTES)).toBe(false);
    expect(isBroadcastStuck(started, "draft", long, FIVE_MINUTES)).toBe(false);
  });

  it("is not stuck without a start time", () => {
    expect(isBroadcastStuck(null, "sending", Date.now(), FIVE_MINUTES)).toBe(false);
  });

  it("does not claim stuck on an unparseable timestamp", () => {
    expect(isBroadcastStuck("not a date", "sending", Date.now(), FIVE_MINUTES)).toBe(false);
  });
});
