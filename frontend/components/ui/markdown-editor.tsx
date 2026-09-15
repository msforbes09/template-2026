"use client";

import { useDeferredValue, useLayoutEffect, useRef, useState } from "react";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Images,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  Sigma,
  SquareCode,
  Strikethrough,
  Table,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import type { GalleryImage } from "@/types/gallery";

// The picker reaches admin-only gallery endpoints and drags the whole gallery
// tree in with it. Loaded on demand so a citizen-facing editor (showGallery
// false — the project form) never ships it.
const GalleryImagePickerDialog = dynamic(
  () =>
    import("@/modules/gallery/components/gallery-image-picker-dialog").then(
      (mod) => mod.GalleryImagePickerDialog,
    ),
  { ssr: false },
);

// Toolbar actions are plain data at module scope (not render-time closures)
// so the React Compiler can verify that ref access only happens inside the
// event-handler dispatch below.
type ToolbarAction =
  | { kind: "wrap"; before: string; after: string; fallback: string }
  | { kind: "heading"; level: number }
  | { kind: "quote" }
  | { kind: "bullet-list" }
  | { kind: "numbered-list" }
  | { kind: "task-list" }
  | { kind: "block"; template: "table" | "code" | "math" | "mermaid" | "hr" };

const BLOCK_TEMPLATES: Record<
  Extract<ToolbarAction, { kind: "block" }>["template"],
  (selected: string) => string
> = {
  table: () => "| Column | Column |\n| --- | --- |\n| Cell | Cell |",
  code: (selected) => `\`\`\`\n${selected || "code"}\n\`\`\``,
  math: (selected) => `$$\n${selected || "e = mc^2"}\n$$`,
  mermaid: () => "```mermaid\ngraph TD;\n  A[Start] --> B[End];\n```",
  hr: () => "---",
};

const TOOLBAR: { label: string; icon: LucideIcon; action: ToolbarAction }[][] = [
  [
    { label: "Bold", icon: Bold, action: { kind: "wrap", before: "**", after: "**", fallback: "bold" } },
    { label: "Italic", icon: Italic, action: { kind: "wrap", before: "*", after: "*", fallback: "italic" } },
    { label: "Strikethrough", icon: Strikethrough, action: { kind: "wrap", before: "~~", after: "~~", fallback: "text" } },
    { label: "Highlight", icon: Highlighter, action: { kind: "wrap", before: "==", after: "==", fallback: "text" } },
    { label: "Inline code", icon: Code, action: { kind: "wrap", before: "`", after: "`", fallback: "code" } },
  ],
  [
    { label: "Heading 2", icon: Heading2, action: { kind: "heading", level: 2 } },
    { label: "Heading 3", icon: Heading3, action: { kind: "heading", level: 3 } },
    { label: "Quote", icon: Quote, action: { kind: "quote" } },
  ],
  [
    { label: "Bullet list", icon: List, action: { kind: "bullet-list" } },
    { label: "Numbered list", icon: ListOrdered, action: { kind: "numbered-list" } },
    { label: "Task list", icon: ListTodo, action: { kind: "task-list" } },
  ],
  [
    { label: "Link", icon: LinkIcon, action: { kind: "wrap", before: "[", after: "](https://)", fallback: "link text" } },
    { label: "Image", icon: ImageIcon, action: { kind: "wrap", before: "![", after: "](https://)", fallback: "alt text" } },
    { label: "Table", icon: Table, action: { kind: "block", template: "table" } },
    { label: "Code block", icon: SquareCode, action: { kind: "block", template: "code" } },
    { label: "Math block (KaTeX)", icon: Sigma, action: { kind: "block", template: "math" } },
    { label: "Diagram (Mermaid)", icon: Workflow, action: { kind: "block", template: "mermaid" } },
    { label: "Horizontal rule", icon: Minus, action: { kind: "block", template: "hr" } },
  ],
];

// In-house markdown editor: formatting toolbar + GitHub-style Write/Preview
// tabs (one full-width pane at a time — replaced the old side-by-side split
// 2026-09-03, which also gives small screens a preview for the first time).
// The preview renders through the shared Markdown component, which runs the
// same engine/extensions as StackEdit (KaTeX, Mermaid, highlights…), so what
// renders here is StackEdit-equivalent — without the external iframe.
export function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder,
  showGallery = true,
  className,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  id?: string;
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  // The gallery picker inserts from the admin image library, whose endpoints
  // are admin-only — pass false on a citizen-facing form (the toolbar button
  // and the dialog both disappear) so the control isn't offered where it
  // would answer 403.
  showGallery?: boolean;
  // Overrides the editor/preview pane height, which defaults to the tall
  // 52dvh the admin catalog editor wants.
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Which pane is showing. The textarea stays MOUNTED (hidden) in preview
  // mode — unmounting it would wipe the browser's undo stack for the field.
  const [mode, setMode] = useState<"write" | "preview">("write");
  // Toolbar edits that fall back to a manual value update park the caret
  // position here; it's applied after React commits the new value.
  const pendingSelection = useRef<[number, number] | null>(null);
  // The gallery picker steals focus/selection from the textarea, so the
  // selection at the moment it's opened is captured here rather than
  // re-read (as blurred/invalid) once an image comes back from the dialog.
  const capturedSelection = useRef<[number, number] | null>(null);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  // Typing stays responsive: the preview re-renders at deferred priority
  // (matters once KaTeX/Mermaid content is in the document).
  const previewText = useDeferredValue(value);

  useLayoutEffect(() => {
    if (pendingSelection.current && textareaRef.current) {
      const [start, end] = pendingSelection.current;
      pendingSelection.current = null;
      textareaRef.current.setSelectionRange(start, end);
    }
  }, [value]);

  // Replace [start, end) with text, then select [selStart, selEnd).
  // execCommand (deprecated but universally supported) is tried first so
  // native undo/redo keeps working for toolbar actions; the manual path is
  // the fallback.
  function replaceRange(
    start: number,
    end: number,
    text: string,
    selStart: number,
    selEnd: number,
  ) {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(start, end);
    let inserted = false;
    try {
      inserted = document.execCommand("insertText", false, text);
    } catch {
      inserted = false;
    }
    if (inserted) {
      el.setSelectionRange(selStart, selEnd);
    } else {
      const next = el.value.slice(0, start) + text + el.value.slice(end);
      pendingSelection.current = [selStart, selEnd];
      onChange(next);
    }
  }

  function wrap(before: string, after: string, fallback: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.slice(start, end) || fallback;
    replaceRange(
      start,
      end,
      before + selected + after,
      start + before.length,
      start + before.length + selected.length,
    );
  }

  function prefixLines(prefix: (line: string, index: number) => string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const lineStart = el.value.lastIndexOf("\n", start - 1) + 1;
    const lineEndIndex = el.value.indexOf("\n", end);
    const lineEnd = lineEndIndex === -1 ? el.value.length : lineEndIndex;
    const next = el.value
      .slice(lineStart, lineEnd)
      .split("\n")
      .map((line, index) => prefix(line, index))
      .join("\n");
    replaceRange(lineStart, lineEnd, next, lineStart, lineStart + next.length);
  }

  // Insert template as its own block at the cursor (replacing any selection),
  // padded with blank lines so fences/tables don't glue onto adjacent text.
  function insertBlock(buildTemplate: (selected: string) => string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const template = buildTemplate(el.value.slice(start, end));
    const textBefore = el.value.slice(0, start);
    const leading =
      !textBefore || textBefore.endsWith("\n\n") ? "" : textBefore.endsWith("\n") ? "\n" : "\n\n";
    const trailing = el.value.slice(end).startsWith("\n") ? "" : "\n";
    const text = leading + template + trailing;
    const caret = start + leading.length + template.length;
    replaceRange(start, end, text, caret, caret);
  }

  function runAction(action: ToolbarAction) {
    switch (action.kind) {
      case "wrap":
        wrap(action.before, action.after, action.fallback);
        break;
      case "heading":
        prefixLines((line) => `${"#".repeat(action.level)} ${line.replace(/^#{1,6}\s+/, "")}`);
        break;
      case "quote":
        prefixLines((line) => (line.startsWith("> ") ? line : `> ${line}`));
        break;
      case "bullet-list":
        prefixLines((line) => (line.startsWith("- ") ? line : `- ${line}`));
        break;
      case "numbered-list":
        prefixLines((line, index) => `${index + 1}. ${line.replace(/^\d+\.\s+/, "")}`);
        break;
      case "task-list":
        prefixLines((line) => (line.startsWith("- [") ? line : `- [ ] ${line}`));
        break;
      case "block":
        insertBlock(BLOCK_TEMPLATES[action.template]);
        break;
    }
  }

  // Opens the gallery picker — a separate flow from runAction() above since
  // it's async and needs a dialog, not a pure text transform.
  function openGalleryPicker() {
    const el = textareaRef.current;
    if (el) capturedSelection.current = [el.selectionStart, el.selectionEnd];
    setGalleryPickerOpen(true);
  }

  function insertGalleryImage(image: GalleryImage) {
    const [start, end] = capturedSelection.current ?? [value.length, value.length];
    const markdown = `![${image.original_name ?? "image"}](${image.url})`;
    replaceRange(start, end, markdown, start + markdown.length, start + markdown.length);
  }

  function switchMode(next: "write" | "preview") {
    setMode(next);
    // Returning to write should land the caret back in the text, like
    // GitHub's editor; rAF waits out the tab's own focus handling.
    if (next === "write") requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      wrap("**", "**", "bold");
    } else if (key === "i") {
      event.preventDefault();
      wrap("*", "*", "italic");
    } else if (key === "k") {
      event.preventDefault();
      wrap("[", "](https://)", "link text");
    }
  }

  return (
    <div
      data-invalid={ariaInvalid || undefined}
      className="overflow-hidden rounded-lg border border-input data-invalid:border-destructive"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-1.5 py-1">
        <Tabs value={mode} onValueChange={(next) => switchMode(next as "write" | "preview")}>
          <TabsList>
            <TabsTrigger value="write" className="px-2.5">
              Write
            </TabsTrigger>
            <TabsTrigger value="preview" className="px-2.5">
              Preview
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {/* Formatting only makes sense against the textarea — GitHub hides
            the toolbar in preview mode too. */}
        {mode === "write" && (
          <div
            role="toolbar"
            aria-label="Markdown formatting"
            className="flex flex-wrap items-center gap-0.5"
          >
            {TOOLBAR.map((group, groupIndex) => (
              <div key={groupIndex} className="flex items-center gap-0.5">
                {groupIndex > 0 && <div aria-hidden className="mx-1 h-4 w-px bg-border" />}
                {group.map((item) => (
                  <Button
                    key={item.label}
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    title={item.label}
                    aria-label={item.label}
                    onClick={() => runAction(item.action)}
                  >
                    <item.icon aria-hidden className="size-3.5" />
                  </Button>
                ))}
              </div>
            ))}
            {showGallery && (
              <div className="flex items-center gap-0.5">
                <div aria-hidden className="mx-1 h-4 w-px bg-border" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title="Insert from gallery"
                  aria-label="Insert from gallery"
                  onClick={openGalleryPicker}
                >
                  <Images aria-hidden className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      <Textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder ?? "Write markdown…"}
        spellCheck={false}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={cn(
          "h-[52dvh] resize-none rounded-none border-0 bg-transparent p-3 font-mono text-xs leading-relaxed focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent",
          mode !== "write" && "hidden",
          className,
        )}
      />
      {mode === "preview" && (
        <div
          aria-label="Preview"
          className={cn("h-[52dvh] overflow-y-auto bg-muted/20 p-3", className)}
        >
          {previewText.trim() ? (
            <Markdown>{previewText}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      )}
      {showGallery && (
        <GalleryImagePickerDialog
          open={galleryPickerOpen}
          onOpenChange={setGalleryPickerOpen}
          onSelect={insertGalleryImage}
        />
      )}
    </div>
  );
}
