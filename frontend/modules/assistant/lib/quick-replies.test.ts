import { describe, expect, it } from "vitest";
import { quickReplyOptions } from "@/modules/assistant/lib/quick-replies";

// This is a fallback for questions the model asked in prose instead of through
// askUser, so the bar is: confident answers only. A wrong split puts misleading
// buttons under a question they don't fit, which is worse than no buttons — so
// the "declines" cases below matter at least as much as the matches.
describe("quickReplyOptions", () => {
  it("offers yes/no for a closed question", () => {
    expect(quickReplyOptions("Do you want me to generate a credential?")).toEqual(["Yes", "No"]);
  });

  it("offers yes/no for an offer phrased as a statement", () => {
    expect(quickReplyOptions("I can run that for you. Would you like me to?")).toEqual([
      "Yes",
      "No",
    ]);
  });

  it("answers the LAST question when a message asks several", () => {
    expect(
      quickReplyOptions("What are you integrating? Should I look up the endpoint?"),
    ).toEqual(["Yes", "No"]);
  });

  it("splits a short either/or into its alternatives", () => {
    expect(quickReplyOptions("Staging or production?")).toEqual(["Staging", "Production"]);
  });

  it("strips the offer phrase before splitting", () => {
    expect(quickReplyOptions("Would you like staging or production?")).toEqual([
      "Staging",
      "Production",
    ]);
  });

  it("declines when the message isn't a question", () => {
    expect(quickReplyOptions("Here is the documentation for eVerify.")).toBeNull();
  });

  it("declines an open question", () => {
    expect(quickReplyOptions("Which endpoint are you trying to call?")).toBeNull();
  });

  it("declines an either/or whose branches are too long to be buttons", () => {
    expect(
      quickReplyOptions(
        "Do you want me to walk through the whole authentication flow step by step or should I just show the raw request body for this one endpoint?",
      ),
      // Falls back to yes/no rather than producing two paragraph-length labels.
    ).toEqual(["Yes", "No"]);
  });

  it("declines a very long question outright", () => {
    expect(quickReplyOptions(`${"why ".repeat(60)}?`)).toBeNull();
  });

  it("declines empty input", () => {
    expect(quickReplyOptions("")).toBeNull();
    expect(quickReplyOptions("   ")).toBeNull();
  });
});
