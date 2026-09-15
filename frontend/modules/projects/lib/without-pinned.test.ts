import { describe, expect, it } from "vitest";
import { withoutPinned } from "@/modules/projects/lib/without-pinned";

import type { PaginationMeta } from "@/types/pagination";

const meta = (over: Partial<PaginationMeta> = {}): PaginationMeta => ({
  current_page: 1,
  last_page: 3,
  per_page: 10,
  total: 23,
  from: 1,
  to: 10,
  ...over,
});

// Your own review is lifted out of the thread and pinned above it, so the
// counter has to describe what is actually listed. Off-by-one counters are
// small, but they are exactly the kind of thing that makes a page feel broken.
describe("withoutPinned", () => {
  it("leaves the meta alone when nothing was pinned", () => {
    expect(withoutPinned(meta(), 10, "1", false)).toEqual(meta());
  });

  it("drops one from the total once a review is pinned", () => {
    expect(withoutPinned(meta(), 9, "1", true).total).toBe(22);
  });

  // The offsets cannot be corrected. Lifting one row out shifts every row
  // after it, and the payload never says whether the lifted row came from
  // before or after this page — which is how page 2 came to read "11–15 of
  // 14". They are dropped rather than guessed at, and the paginator prints a
  // position instead (see lib/pagination-label.ts).
  it("drops the offsets rather than guessing at them", () => {
    const result = withoutPinned(meta(), 9, "1", true);
    expect(result.from).toBeNull();
    expect(result.to).toBeNull();
  });

  it("drops them on a later page too, where they used to overshoot the total", () => {
    const result = withoutPinned(meta({ current_page: 2, from: 11, to: 20 }), 10, "2", true);
    expect(result.from).toBeNull();
    expect(result.to).toBeNull();
    expect(result.total).toBe(22);
  });

  // A thread of exactly one review, and it is yours: the list is empty and the
  // counter must not claim otherwise.
  it("reports an empty thread when the only review was the pinned one", () => {
    const result = withoutPinned(meta({ last_page: 1, total: 1, to: 1 }), 0, "1", true);
    expect(result.total).toBe(0);
  });

  it("never reports a negative total", () => {
    expect(withoutPinned(meta({ total: 0, from: null, to: null }), 0, "1", true).total).toBe(0);
  });

  // Missing meta is a real shape from the API; fall back rather than crash.
  it("synthesises a single page when the API sent no meta", () => {
    const result = withoutPinned(undefined, 4, "1", true);
    expect(result).toMatchObject({ current_page: 1, last_page: 1, total: 4, from: 1, to: 4 });
  });
})
