"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { highlightCode, languageLabel } from "@/lib/highlight";
import { splitVariableTokens } from "@/modules/api-docs/lib/postman";

export function CodeBlock({
  code,
  label,
  // Set for a programming-language snippet (the assistant's generated code,
  // ```json / ```bash / ```php…). It names the block and turns on syntax
  // highlighting; without it this stays the plain value viewer it has always
  // been, which is what every other caller wants for a token or a URL.
  language,
  highlightVariables = false,
  className,
}: {
  code: string;
  label?: string;
  language?: string | null;
  highlightVariables?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  // highlight.js is loaded on demand, so the first paint is always the plain
  // text and the coloured markup swaps in when the grammar lands.
  //
  // The result is stored WITH the code+language it was produced for, and only
  // used while that still matches. A streaming block re-renders on every
  // token, and the alternative — clearing the state when the input changes —
  // means calling setState straight from an effect, which cascades renders on
  // something that already renders constantly.
  const [result, setResult] = useState<{ key: string; markup: string } | null>(null);

  // Variable highlighting is a different job (marking {{tokens}} in a Postman
  // template) and owns the same markup, so the two never run together.
  const syntax = language && !highlightVariables ? language : null;
  const key = syntax ? `${syntax}\u0000${code}` : null;

  useEffect(() => {
    if (!syntax || !key) return;
    let cancelled = false;
    void highlightCode(code, syntax).then((markup) => {
      if (!cancelled && markup) setResult({ key, markup });
    });
    return () => {
      cancelled = true;
    };
  }, [code, syntax, key]);

  const highlighted = key && result?.key === key ? result.markup : null;

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const heading = label ?? languageLabel(language);

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-muted/40", className)}>
      <div className="flex h-9 items-center justify-between border-b border-border px-3">
        <span className="text-xs font-medium text-muted-foreground">{heading}</span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={copied ? "Copied" : "Copy to clipboard"}
          onClick={() => void copy()}
        >
          {copied ? (
            <Check aria-hidden className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Copy aria-hidden className="size-3.5" />
          )}
        </Button>
      </div>
      <pre
        className={cn(
          "max-h-96 overflow-auto p-3 font-mono text-xs leading-relaxed",
          // Code keeps its own line breaks and scrolls sideways: wrapping it
          // (and break-all in particular) destroys indentation and splits
          // identifiers mid-word. A bare value — a token, a URL — has no
          // structure to lose and should wrap rather than scroll.
          syntax ? "whitespace-pre" : "whitespace-pre-wrap break-all",
        )}
      >
        {highlighted ? (
          // Safe: this is highlight.js's own output, which escapes the source
          // it was given — the code itself never reaches the DOM as markup.
          <code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
        ) : highlightVariables ? (
          splitVariableTokens(code).map((part, i) =>
            part.isVariable ? (
              <span key={i} className="font-semibold text-primary">
                {part.text}
              </span>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )
        ) : (
          code
        )}
      </pre>
    </div>
  );
}
