import { describe, expect, it } from "vitest";
import {
  parseAskUser,
  parseCanTest,
  parseCatalogList,
  parseChooseTestTarget,
  parseCredentialInput,
  parseIdentifier,
  parseSignInPrompt,
  parseTestInput,
} from "@/modules/assistant/lib/tool-output";

// The contract every one of these shares: garbage in, nothing rendered. These
// inputs are model-generated or come from a tool whose shape the client can't
// verify, and they arrive mid-conversation — so the failure mode has to be "no
// card", never a thrown error that takes the chat down.
const GARBAGE = [null, undefined, "", 0, false, [], "a string", { unrelated: true }];

describe("parseCatalogList", () => {
  it("keeps well-formed entries", () => {
    expect(
      parseCatalogList({
        catalogs: [
          { identifier: "everify", name: "eVerify" },
          { identifier: "compass", name: "Compass" },
        ],
      }),
    ).toEqual([
      { identifier: "everify", name: "eVerify" },
      { identifier: "compass", name: "Compass" },
    ]);
  });

  it("keeps an entry with no name, since the identifier can stand in", () => {
    expect(parseCatalogList({ catalogs: [{ identifier: "everify" }] })).toEqual([
      { identifier: "everify", name: null },
    ]);
  });

  it("drops entries with no usable identifier instead of rendering a dead button", () => {
    expect(
      parseCatalogList({
        catalogs: [{ name: "Nameless" }, { identifier: "" }, null, "nope", { identifier: "ok" }],
      }),
    ).toEqual([{ identifier: "ok", name: null }]);
  });

  it("returns an empty list for anything unrecognised", () => {
    for (const input of GARBAGE) expect(parseCatalogList(input)).toEqual([]);
  });
});

describe("parseCanTest", () => {
  it("is true only for an explicit true", () => {
    expect(parseCanTest({ canTest: true })).toBe(true);
    expect(parseCanTest({ canTest: "true" })).toBe(false);
    expect(parseCanTest({ canTest: 1 })).toBe(false);
  });

  it("defaults to false when absent or malformed", () => {
    // Offering documentation to someone who could have tested is a small loss;
    // offering a test to someone who can't run one is a broken promise.
    expect(parseCanTest({ catalogs: [] })).toBe(false);
    for (const input of GARBAGE) expect(parseCanTest(input)).toBe(false);
  });
});

// There is one sign-in method now — eGovPH SSO was removed — so the prompt no
// longer carries a `method` to choose between, and `shown` is what marks the
// output as this tool's rather than another's.
describe("parseSignInPrompt", () => {
  it("accepts a shown prompt, with or without a reason", () => {
    expect(parseSignInPrompt({ shown: true, reason: "test an endpoint" })).toEqual({
      reason: "test an endpoint",
    });
    expect(parseSignInPrompt({ shown: true, reason: null })).toEqual({ reason: null });
  });

  it("renders nothing for output that isn't this tool's", () => {
    expect(parseSignInPrompt({ shown: false })).toBeNull();
    expect(parseSignInPrompt({ method: "email" })).toBeNull();
    for (const input of GARBAGE) expect(parseSignInPrompt(input)).toBeNull();
  });

  it("normalises an empty reason to null", () => {
    expect(parseSignInPrompt({ shown: true, reason: "" })?.reason).toBeNull();
  });
});

describe("parseAskUser", () => {
  it("keeps a question with at least two usable options", () => {
    expect(parseAskUser({ question: "Proceed?", options: ["Yes", "No"] })).toEqual({
      question: "Proceed?",
      options: ["Yes", "No"],
    });
  });

  it("drops non-string and blank options", () => {
    expect(
      parseAskUser({ question: "Pick", options: ["  Staging  ", 42, "", null, "Production"] }),
    ).toEqual({ question: "Pick", options: ["Staging", "Production"] });
  });

  it("caps the options at five", () => {
    const options = ["a", "b", "c", "d", "e", "f", "g"];
    expect(parseAskUser({ question: "Pick", options })?.options).toHaveLength(5);
  });

  it("returns null when fewer than two options survive, leaving prose to stand", () => {
    expect(parseAskUser({ question: "Proceed?", options: ["Yes"] })).toBeNull();
    expect(parseAskUser({ question: "Proceed?", options: [] })).toBeNull();
    expect(parseAskUser({ question: "   ", options: ["Yes", "No"] })).toBeNull();
    for (const input of GARBAGE) expect(parseAskUser(input)).toBeNull();
  });
});

describe("parseTestInput", () => {
  it("requires both an identifier and a request name", () => {
    expect(parseTestInput({ identifier: "everify", requestName: "Authenticate" })).toEqual({
      identifier: "everify",
      requestName: "Authenticate",
    });
    expect(parseTestInput({ identifier: "everify" })).toBeNull();
    expect(parseTestInput({ requestName: "Authenticate" })).toBeNull();
    for (const input of GARBAGE) expect(parseTestInput(input)).toBeNull();
  });
});

describe("parseCredentialInput", () => {
  it("accepts only the two real actions", () => {
    expect(parseCredentialInput({ identifier: "compass", action: "generate" })).toEqual({
      identifier: "compass",
      action: "generate",
    });
    expect(parseCredentialInput({ identifier: "compass", action: "revoke" })?.action).toBe(
      "revoke",
    );
  });

  it("rejects anything else, since the card acts on this", () => {
    expect(parseCredentialInput({ identifier: "compass", action: "delete" })).toBeNull();
    expect(parseCredentialInput({ identifier: "", action: "generate" })).toBeNull();
    for (const input of GARBAGE) expect(parseCredentialInput(input)).toBeNull();
  });
});

describe("parseIdentifier", () => {
  it("returns the identifier or null", () => {
    expect(parseIdentifier({ identifier: "egov-sso" })).toBe("egov-sso");
    expect(parseIdentifier({ identifier: "" })).toBeNull();
    for (const input of GARBAGE) expect(parseIdentifier(input)).toBeNull();
  });
});

describe("parseChooseTestTarget", () => {
  it("passes through both hints when present", () => {
    expect(parseChooseTestTarget({ identifier: "egov-sso", justTested: "Generates Access Token" }))
      .toEqual({ identifier: "egov-sso", justTested: "Generates Access Token" });
  });

  it("returns undefined hints rather than empty strings", () => {
    // The card treats undefined as "no hint"; "" would read as a real value.
    expect(parseChooseTestTarget({ identifier: "", justTested: "" })).toEqual({
      identifier: undefined,
      justTested: undefined,
    });
    for (const input of GARBAGE) expect(parseChooseTestTarget(input)).toEqual({});
  });
});
