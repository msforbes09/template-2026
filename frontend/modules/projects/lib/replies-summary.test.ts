import { describe, expect, it } from "vitest";
import { repliesSummary } from "@/modules/projects/lib/replies-summary";

const reply = (isOwner: 0 | 1) => ({ is_owner: isOwner });

// The label on a folded thread. A team answer is the reply people most want
// to notice, so it is called out rather than counted anonymously.
describe("repliesSummary", () => {
  it("counts a single reply", () => {
    expect(repliesSummary([reply(0)])).toBe("1 reply");
  });

  it("pluralises", () => {
    expect(repliesSummary([reply(0), reply(0)])).toBe("2 replies");
  });

  it("names the project team when they answered", () => {
    expect(repliesSummary([reply(1)])).toBe("1 reply from the project team");
  });

  it("names them alongside others too", () => {
    expect(repliesSummary([reply(0), reply(1)])).toBe("2 replies, including the project team");
  });

  it("says nothing for an empty thread", () => {
    expect(repliesSummary([])).toBe(null);
  });
});
