import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { pruneUnansweredToolCalls } from "@/modules/assistant/lib/prune-messages";

// Guards a conversation-killing bug: an unanswered client-side tool call makes
// the provider reject the whole history, and because that failure happens
// inside the stream it shows up as a bare "Something went wrong" on every
// subsequent message rather than once.
function message(role: UIMessage["role"], parts: unknown[]): UIMessage {
  return { id: `${role}-1`, role, parts } as UIMessage;
}

describe("pruneUnansweredToolCalls", () => {
  it("drops a tool call the user never answered", () => {
    const result = pruneUnansweredToolCalls([
      message("user", [{ type: "text", text: "Show me the docs" }]),
      message("assistant", [
        { type: "text", text: "Which endpoint?" },
        {
          type: "tool-askUser",
          toolCallId: "c1",
          state: "input-available",
          input: { question: "Which?", options: ["A", "B"] },
        },
      ]),
      message("user", [{ type: "text", text: "the QR one" }]),
    ]);

    expect(result).toHaveLength(3);
    // The model's own question survives — it's what the user just replied to.
    expect(result[1].parts).toEqual([{ type: "text", text: "Which endpoint?" }]);
  });

  it("keeps an answered tool call, result and all", () => {
    const answered = {
      type: "tool-testApiCatalogEndpoint",
      toolCallId: "c1",
      state: "output-available",
      input: { identifier: "compass", requestName: "Get SAAODB Records" },
      output: { code: 200, body: "{}" },
    };
    const result = pruneUnansweredToolCalls([message("assistant", [answered])]);

    // Dropping this would erase what actually happened — the response body the
    // model is about to summarise.
    expect(result[0].parts).toEqual([answered]);
  });

  it("keeps a failed tool call, which is also a real outcome", () => {
    const failed = {
      type: "tool-prepareCatalogTest",
      toolCallId: "c1",
      state: "output-error",
      errorText: "Camera unavailable",
    };
    expect(pruneUnansweredToolCalls([message("assistant", [failed])])[0].parts).toEqual([failed]);
  });

  it("drops a call still streaming its input", () => {
    const result = pruneUnansweredToolCalls([
      message("assistant", [
        { type: "text", text: "One moment" },
        { type: "tool-chooseTestTarget", toolCallId: "c1", state: "input-streaming" },
      ]),
    ]);
    expect(result[0].parts).toHaveLength(1);
  });

  it("removes a message left with nothing rather than sending it empty", () => {
    const result = pruneUnansweredToolCalls([
      message("user", [{ type: "text", text: "hi" }]),
      message("assistant", [
        { type: "tool-askUser", toolCallId: "c1", state: "input-available", input: {} },
      ]),
      message("user", [{ type: "text", text: "actually never mind" }]),
    ]);

    expect(result).toHaveLength(2);
    expect(result.every((entry) => entry.parts.length > 0)).toBe(true);
  });

  it("handles dynamic-tool parts the same way", () => {
    const result = pruneUnansweredToolCalls([
      message("assistant", [
        { type: "text", text: "hm" },
        { type: "dynamic-tool", toolCallId: "c1", state: "input-available" },
      ]),
    ]);
    expect(result[0].parts).toHaveLength(1);
  });

  it("leaves a history with no tool calls untouched", () => {
    const history = [
      message("user", [{ type: "text", text: "hello" }]),
      message("assistant", [{ type: "text", text: "hi" }]),
    ];
    expect(pruneUnansweredToolCalls(history)).toEqual(history);
  });

  it("survives a message with no parts array", () => {
    const odd = { id: "x", role: "user" } as UIMessage;
    expect(() => pruneUnansweredToolCalls([odd])).not.toThrow();
  });
});
