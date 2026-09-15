// Splits an assistant message into prose and fenced code.
//
// Everything the model writes goes through <Markdown>, which renders a fence
// as a bare <pre><code> — no language, no copy button, and in the 30rem chat
// panel a long line just runs off the edge. Code is the one thing people
// actually take out of this chat, so fences are pulled out here and rendered
// with the portal's own CodeBlock (label + copy + syntax highlighting) while
// the prose around them keeps going through the markdown renderer.
//
// Deliberately a line scanner rather than a markdown parse: the message is
// still streaming when this runs, so the last fence is usually unterminated
// and has to render as code anyway rather than waiting for its closing ticks.

export type MessageSegment =
  | { kind: "text"; value: string }
  | { kind: "code"; value: string; language: string | null };

// CommonMark: up to three leading spaces, three or more backticks or tildes,
// then an optional info string whose first word is the language.
const OPENING_FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)/;
const CLOSING_FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;

// Mermaid stays with the markdown renderer, which turns that fence into an
// actual diagram (see components/ui/markdown.tsx). Pulling it out here would
// downgrade a rendered diagram to its source.
const RENDERED_BY_MARKDOWN = new Set(["mermaid"]);

export function splitMessageSegments(text: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  // Prose accumulates here; a fence that markdown should keep is pushed back
  // into it verbatim, fence lines and all.
  let prose: string[] = [];
  let open: { marker: string; language: string | null; raw: string[]; body: string[] } | null = null;

  const flushProse = () => {
    if (prose.join("\n").trim()) segments.push({ kind: "text", value: prose.join("\n") });
    prose = [];
  };

  const closeFence = (closingLine: string | null) => {
    if (!open) return;
    if (open.language && RENDERED_BY_MARKDOWN.has(open.language)) {
      prose.push(...open.raw);
      if (closingLine !== null) prose.push(closingLine);
    } else {
      flushProse();
      segments.push({ kind: "code", value: open.body.join("\n"), language: open.language });
    }
    open = null;
  };

  for (const line of text.split("\n")) {
    if (open) {
      const closing = line.match(CLOSING_FENCE);
      // A closing fence must use the same character and be at least as long as
      // the one that opened the block — so ``` inside a ~~~ block is content.
      if (closing && closing[1][0] === open.marker[0] && closing[1].length >= open.marker.length) {
        closeFence(line);
        continue;
      }
      open.raw.push(line);
      open.body.push(line);
      continue;
    }

    const opening = line.match(OPENING_FENCE);
    if (opening) {
      open = {
        marker: opening[1],
        language: opening[2] ? opening[2].toLowerCase() : null,
        raw: [line],
        body: [],
      };
      continue;
    }

    prose.push(line);
  }

  // An unterminated fence is the normal state mid-stream: emit what has
  // arrived so far as code, so the block appears as the model types into it
  // rather than snapping into place at the closing ticks.
  closeFence(null);
  flushProse();

  return segments;
}
