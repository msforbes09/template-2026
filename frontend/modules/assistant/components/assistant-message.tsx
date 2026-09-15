"use client";

import { useMemo } from "react";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";
import { CodeBlock } from "@/modules/api-docs/components/code-block";
import { splitMessageSegments } from "@/modules/assistant/lib/message-segments";

// One assistant text part: prose through the markdown renderer, fenced code
// through the portal's CodeBlock.
//
// Code is what people take out of this chat — a curl call, a request body, a
// snippet in their language — and <Markdown> renders a fence as a bare
// <pre><code>: no language, nothing to click to copy it, and long lines
// running off the side of a 30rem panel. The same block used on the API
// documentation pages gives it a labelled header, a copy button and syntax
// highlighting, so what the assistant writes looks like the rest of the
// portal's code rather than indented grey text.
export function AssistantMessage({ text, roomy }: { text: string; roomy?: boolean }) {
  const segments = useMemo(() => splitMessageSegments(text), [text]);

  return (
    // min-w-0 so a wide code block scrolls inside the message column instead
    // of stretching it.
    <div className="flex w-full min-w-0 flex-col gap-2">
      {segments.map((segment, index) =>
        segment.kind === "code" ? (
          <CodeBlock
            key={index}
            code={segment.value}
            language={segment.language}
            // A fence with no language still gets the block and the copy
            // button; there's just nothing to name or colour it with.
            label={segment.language ? undefined : "Code"}
            className="bg-muted/60"
          />
        ) : (
          <Markdown key={index} className={cn("max-w-full", roomy ? undefined : "text-sm")}>
            {segment.value}
          </Markdown>
        ),
      )}
    </div>
  );
}
