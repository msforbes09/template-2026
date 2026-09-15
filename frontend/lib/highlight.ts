import type { HLJSApi, LanguageFn } from "highlight.js";

// Syntax highlighting for CodeBlock, loaded on demand.
//
// highlight.js ships ~200 languages and its bundled entrypoint pulls all of
// them (~1MB). This registers one grammar at a time against the core build, so
// a page that never renders a snippet loads none of it and a chat answer with
// a curl example loads exactly bash — the same treatment mermaid gets in
// components/ui/markdown.tsx.
//
// Token colours are ours (see the .hljs-* block in app/globals.css) rather
// than one of highlight.js's stylesheets: those ship as one file per theme
// with no light/dark switching, and none of them match this palette.

// Everything the assistant plausibly writes for a developer integrating with
// the gateway. A language not listed here renders unhighlighted rather than
// wrong — the block, its label and its copy button still work.
const LANGUAGES: Record<string, () => Promise<{ default: LanguageFn }>> = {
  bash: () => import("highlight.js/lib/languages/bash"),
  c: () => import("highlight.js/lib/languages/c"),
  cpp: () => import("highlight.js/lib/languages/cpp"),
  csharp: () => import("highlight.js/lib/languages/csharp"),
  css: () => import("highlight.js/lib/languages/css"),
  dart: () => import("highlight.js/lib/languages/dart"),
  go: () => import("highlight.js/lib/languages/go"),
  http: () => import("highlight.js/lib/languages/http"),
  ini: () => import("highlight.js/lib/languages/ini"),
  java: () => import("highlight.js/lib/languages/java"),
  javascript: () => import("highlight.js/lib/languages/javascript"),
  json: () => import("highlight.js/lib/languages/json"),
  kotlin: () => import("highlight.js/lib/languages/kotlin"),
  markdown: () => import("highlight.js/lib/languages/markdown"),
  php: () => import("highlight.js/lib/languages/php"),
  python: () => import("highlight.js/lib/languages/python"),
  ruby: () => import("highlight.js/lib/languages/ruby"),
  rust: () => import("highlight.js/lib/languages/rust"),
  sql: () => import("highlight.js/lib/languages/sql"),
  swift: () => import("highlight.js/lib/languages/swift"),
  typescript: () => import("highlight.js/lib/languages/typescript"),
  xml: () => import("highlight.js/lib/languages/xml"),
  yaml: () => import("highlight.js/lib/languages/yaml"),
};

// What people actually type after the opening backticks. `curl` and `sh` are
// the two the model writes most for this API; both are bash as far as the
// grammar is concerned. `html` is xml's grammar in highlight.js.
const ALIASES: Record<string, string> = {
  bash: "bash",
  curl: "bash",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  "c#": "csharp",
  cs: "csharp",
  dotnet: "csharp",
  golang: "go",
  html: "xml",
  js: "javascript",
  jsx: "javascript",
  kt: "kotlin",
  md: "markdown",
  node: "javascript",
  py: "python",
  rb: "ruby",
  rs: "rust",
  svg: "xml",
  ts: "typescript",
  tsx: "typescript",
  yml: "yaml",
};

// Display names for the label bar, where the raw fence tag reads like a file
// extension. Anything unlisted shows as typed.
const LABELS: Record<string, string> = {
  bash: "Bash",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  css: "CSS",
  curl: "cURL",
  dart: "Dart",
  go: "Go",
  html: "HTML",
  http: "HTTP",
  ini: "INI",
  java: "Java",
  javascript: "JavaScript",
  json: "JSON",
  jsx: "JSX",
  kotlin: "Kotlin",
  markdown: "Markdown",
  php: "PHP",
  python: "Python",
  ruby: "Ruby",
  rust: "Rust",
  shell: "Shell",
  sql: "SQL",
  swift: "Swift",
  text: "Text",
  tsx: "TSX",
  typescript: "TypeScript",
  xml: "XML",
  yaml: "YAML",
};

function normalize(language: string): string {
  return language.trim().toLowerCase().replace(/^\./, "");
}

// The grammar to highlight with, or null when we don't carry one. Kept
// separate from the label so an unsupported language still gets a named block.
export function resolveLanguage(language: string | null | undefined): string | null {
  if (!language) return null;
  const key = normalize(language);
  const canonical = ALIASES[key] ?? key;
  return canonical in LANGUAGES ? canonical : null;
}

export function languageLabel(language: string | null | undefined): string | null {
  if (!language) return null;
  const key = normalize(language);
  return LABELS[key] ?? LABELS[ALIASES[key] ?? ""] ?? key;
}

let core: Promise<HLJSApi> | null = null;
// Per-language, so two blocks in the same answer share one import instead of
// racing to register the same grammar twice.
const grammars = new Map<string, Promise<void>>();

// Returns highlight.js's markup for the code, or null if it can't be
// highlighted — the caller renders the plain text in that case.
export async function highlightCode(code: string, language: string): Promise<string | null> {
  const canonical = resolveLanguage(language);
  if (!canonical) return null;

  core ??= import("highlight.js/lib/core").then((mod) => mod.default);
  const hljs = await core;

  let grammar = grammars.get(canonical);
  if (!grammar) {
    grammar = LANGUAGES[canonical]().then((mod) => {
      hljs.registerLanguage(canonical, mod.default);
    });
    grammars.set(canonical, grammar);
  }
  await grammar;

  try {
    // ignoreIllegals because a snippet is often a fragment — a lone object
    // literal, a half-written line still streaming in — and the strict parse
    // throws on those instead of doing its best.
    return hljs.highlight(code, { language: canonical, ignoreIllegals: true }).value;
  } catch {
    return null;
  }
}
