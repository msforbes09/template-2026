"use client";

import { useEffect, useMemo, useRef } from "react";
import MarkdownIt from "markdown-it";
import abbr from "markdown-it-abbr";
import deflist from "markdown-it-deflist";
import { full as emoji } from "markdown-it-emoji";
import footnote from "markdown-it-footnote";
import mark from "markdown-it-mark";
import sub from "markdown-it-sub";
import sup from "markdown-it-sup";
import taskLists from "markdown-it-task-lists";
import katexPlugin from "@vscode/markdown-it-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

// The same markdown engine and extension set as StackEdit's default preset
// (markdown-it with breaks/linkify/typographer plus abbr, deflist, emoji,
// footnote, mark, sub, sup, task lists, KaTeX math, and Mermaid diagrams) —
// so content authored in StackEdit renders here the same way. Raw HTML in
// the source stays escaped (html: false), the safe behavior for content we
// didn't author.
const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: true,
})
  .use(abbr)
  .use(deflist)
  .use(emoji)
  .use(footnote)
  .use(mark)
  .use(sub)
  .use(sup)
  .use(taskLists, { enabled: false })
  .use(katexPlugin);

// ```mermaid fences become <pre class="mermaid"> for the client-side
// renderer below; every other fence keeps the default treatment.
const defaultFence =
  md.renderer.rules.fence ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (token.info.trim() === "mermaid") {
    return `<pre class="mermaid">${md.utils.escapeHtml(token.content)}</pre>`;
  }
  return defaultFence(tokens, idx, options, env, self);
};

// External links open in a new tab (matches the previous renderer's behavior).
md.renderer.rules.link_open = (tokens, idx, options, _env, self) => {
  tokens[idx].attrSet("target", "_blank");
  tokens[idx].attrSet("rel", "noreferrer");
  return self.renderToken(tokens, idx, options);
};

// Unique ids for manual mermaid.render() calls (svg ids must not collide
// across diagrams or re-renders).
let mermaidSeq = 0;

export function Markdown({ children, className }: { children: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const html = useMemo(() => md.render(children), [children]);

  // Mermaid renders in the browser after the HTML lands. The library is
  // heavy (~1MB), so it's only imported when a diagram is actually present.
  // Rendered manually from each node's textContent via mermaid.render()
  // rather than mermaid.run(): run() reads innerHTML, where the fence rule's
  // escaping turns `-->` into `--&gt;` and corrupts the diagram source, and
  // its error handling injects a "syntax error" graphic — unusable in the
  // live editor preview where half-typed diagrams are the normal case.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const nodes = Array.from(container.querySelectorAll<HTMLElement>("pre.mermaid"));
    if (nodes.length === 0) return;
    let cancelled = false;
    void (async () => {
      const { default: mermaid } = await import("mermaid");
      // Mermaid sizes nodes by measuring label text — measuring before the
      // webfont has loaded uses fallback-font metrics and draws a garbled
      // diagram on first load (correct only after a later re-render).
      await document.fonts.ready;
      if (cancelled) return;
      mermaid.initialize({
        startOnLoad: false,
        suppressErrorRendering: true,
        theme: document.documentElement.classList.contains("dark") ? "dark" : "default",
      });
      for (const node of nodes) {
        const source = node.textContent ?? "";
        mermaidSeq += 1;
        const renderId = `mmd-${mermaidSeq}`;
        try {
          const { svg } = await mermaid.render(renderId, source);
          if (cancelled) return;
          node.innerHTML = svg;
          node.classList.remove("mermaid-error");
          node.removeAttribute("title");
        } catch (err) {
          // incomplete/invalid diagram (normal mid-keystroke in the editor
          // preview) — keep the raw source visible, flag it visually, and
          // surface the parser's message as a hover tooltip. Also clear the
          // temp element some mermaid versions leave behind on failure.
          console.debug("[markdown] mermaid render failed", err);
          document.getElementById(`d${renderId}`)?.remove();
          if (cancelled) return;
          node.textContent = source;
          node.classList.add("mermaid-error");
          // First 4 lines carries the actual diagnostic (message + offending
          // snippet + caret), not just "Parse error on line N:" — title
          // attributes do render embedded newlines, so this is legible on
          // hover without opening devtools.
          node.title = err instanceof Error
            ? err.message.split("\n").slice(0, 4).join("\n")
            : "Invalid Mermaid diagram";
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "text-sm leading-relaxed text-muted-foreground",
        // block rhythm
        "[&_p]:mb-2 [&_p:last-child]:mb-0",
        // headings
        "[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-foreground [&_h1:first-child]:mt-0",
        "[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2:first-child]:mt-0",
        "[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_h3:first-child]:mt-0",
        "[&_h4]:mt-3 [&_h4]:mb-1.5 [&_h4]:text-sm [&_h4]:font-medium [&_h4]:text-foreground",
        // emphasis & links
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
        // inline code & code blocks
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-foreground",
        "[&_pre]:mb-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted/40 [&_pre]:p-3",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
        // lists
        "[&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-0.5",
        // task lists (markdown-it-task-lists)
        "[&_li.task-list-item]:list-none [&_ul.contains-task-list]:pl-1.5 [&_input.task-list-item-checkbox]:mr-1.5 [&_input.task-list-item-checkbox]:align-middle [&_input.task-list-item-checkbox]:accent-primary",
        // tables
        "[&_table]:mb-2 [&_table]:block [&_table]:w-max [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse",
        "[&_th]:border [&_th]:border-border [&_th]:bg-muted/60 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:text-foreground",
        "[&_td]:border [&_td]:border-border [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:align-top [&_td]:text-xs",
        // StackEdit extras: highlight, abbreviations, definition lists, footnotes
        "[&_mark]:rounded-sm [&_mark]:bg-amber-200 [&_mark]:px-0.5 dark:[&_mark]:bg-amber-500/40 dark:[&_mark]:text-foreground",
        "[&_abbr]:cursor-help [&_abbr]:underline [&_abbr]:decoration-dotted",
        "[&_dt]:font-semibold [&_dt]:text-foreground [&_dd]:mb-2 [&_dd]:pl-4",
        "[&_section.footnotes]:mt-4 [&_section.footnotes]:border-t [&_section.footnotes]:border-border [&_section.footnotes]:pt-2 [&_section.footnotes]:text-xs",
        // KaTeX & Mermaid
        "[&_.katex-display]:overflow-x-auto [&_.katex-display]:py-1",
        "[&_pre.mermaid]:flex [&_pre.mermaid]:justify-center [&_pre.mermaid]:bg-transparent",
        // invalid diagram source: amber dashed border, parser message on hover
        "[&_pre.mermaid-error]:justify-start [&_pre.mermaid-error]:border-dashed [&_pre.mermaid-error]:border-amber-500/70",
        // misc
        "[&_blockquote]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic",
        "[&_hr]:my-3 [&_hr]:border-border",
        className,
      )}
      // Safe: html:false escapes any raw HTML in the markdown source, so the
      // rendered output only contains markup produced by markdown-it itself.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
