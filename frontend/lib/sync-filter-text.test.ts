import { describe, expect, it } from "vitest";
import { syncFilterText } from "@/lib/sync-filter-text";

describe("syncFilterText", () => {
  it("does nothing when the URL has not moved", () => {
    expect(syncFilterText("juan", "juan", "juan")).toEqual({ changed: false, adopt: false });
    expect(syncFilterText("", "", "")).toEqual({ changed: false, adopt: false });
  });

  // THE REPORTED BUG. A sidebar status link goes to the same route with
  // ?status=… and no ?q=, so the toolbar never unmounts. As an uncontrolled
  // defaultValue the box kept showing "juan" over a list that was no longer
  // filtered by it.
  it("clears the box when the filter is dropped from the URL", () => {
    expect(syncFilterText("", "juan", "juan")).toEqual({ changed: true, adopt: true });
  });

  it("adopts a filter applied from somewhere else on the page", () => {
    // A badge click or a chip that sets the term the box is bound to.
    expect(syncFilterText("juan", "", "")).toEqual({ changed: true, adopt: true });
  });

  // The other half of the bug, and the reason a naive "always mirror the URL"
  // fix is wrong: our own debounced push echoes back through the same param a
  // beat after it lands, by which point the user has usually typed more.
  it("ignores the echo of its own push", () => {
    // Pushed "ju", URL catches up to "ju", box already reads "juan".
    expect(syncFilterText("ju", "", "ju")).toEqual({ changed: true, adopt: false });
  });

  it("still adopts a later external change after one of its own pushes", () => {
    // Own echo reconciled first...
    expect(syncFilterText("ju", "", "ju")).toEqual({ changed: true, adopt: false });
    // ...then someone clears the filter. That is not our push, so adopt it.
    expect(syncFilterText("", "ju", "ju")).toEqual({ changed: true, adopt: true });
  });

  it("treats a bare URL as an empty box, whatever was typed before", () => {
    for (const typed of ["juan", "a", "  ", "very long search term"]) {
      expect(syncFilterText("", typed, typed).adopt).toBe(true);
    }
  });
});
