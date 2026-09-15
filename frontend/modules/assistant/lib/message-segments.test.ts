import { describe, expect, it } from "vitest";
import { splitMessageSegments } from "@/modules/assistant/lib/message-segments";

// The splitter runs on every render of a streaming message, so the
// half-arrived cases matter as much as the finished ones.
describe("splitMessageSegments", () => {
  it("leaves prose alone", () => {
    expect(splitMessageSegments("Call the token endpoint first.")).toEqual([
      { kind: "text", value: "Call the token endpoint first." },
    ]);
  });

  it("pulls a fenced block out with its language", () => {
    const segments = splitMessageSegments(
      ["Here you go:", "", "```bash", "curl https://example.test", "```", "", "That's it."].join(
        "\n",
      ),
    );
    expect(segments).toEqual([
      { kind: "text", value: "Here you go:\n" },
      { kind: "code", value: "curl https://example.test", language: "bash" },
      { kind: "text", value: "\nThat's it." },
    ]);
  });

  it("keeps a fence with no language as a code block", () => {
    expect(splitMessageSegments("```\nplain\n```")).toEqual([
      { kind: "code", value: "plain", language: null },
    ]);
  });

  it("lowercases the language tag", () => {
    expect(splitMessageSegments("```JSON\n{}\n```")[0]).toMatchObject({ language: "json" });
  });

  it("renders an unterminated fence as code while it is still streaming", () => {
    expect(splitMessageSegments('Here:\n\n```json\n{\n  "client_id": "')).toEqual([
      { kind: "text", value: "Here:\n" },
      { kind: "code", value: '{\n  "client_id": "', language: "json" },
    ]);
  });

  it("handles several blocks in one message", () => {
    const segments = splitMessageSegments(
      ["```bash", "one", "```", "then", "```json", "{}", "```"].join("\n"),
    );
    expect(segments.map((segment) => segment.kind)).toEqual(["code", "text", "code"]);
  });

  it("treats backticks inside a tilde fence as content", () => {
    expect(splitMessageSegments("~~~md\n```\nnested\n```\n~~~")).toEqual([
      { kind: "code", value: "```\nnested\n```", language: "md" },
    ]);
  });

  it("leaves a mermaid fence to the markdown renderer, which draws it", () => {
    const source = "```mermaid\ngraph TD;\nA-->B;\n```";
    expect(splitMessageSegments(source)).toEqual([{ kind: "text", value: source }]);
  });

  it("drops whitespace-only prose between blocks", () => {
    const segments = splitMessageSegments("```bash\none\n```\n\n\n```bash\ntwo\n```");
    expect(segments.map((segment) => segment.kind)).toEqual(["code", "code"]);
  });

  it("does not lose a fence that never closes and has no body yet", () => {
    expect(splitMessageSegments("```php")).toEqual([
      { kind: "code", value: "", language: "php" },
    ]);
  });
});
