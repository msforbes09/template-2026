// A project's `description` is markdown, but `<meta name="description">`,
// OpenGraph and JSON-LD all want plain prose. The tagline is the intended
// summary and is used whenever there is one; this is the fallback for
// projects that skipped it.
//
// Deliberately a light strip rather than a markdown parse: the aim is a
// readable sentence or two, not faithful rendering, and pulling the markdown
// renderer into metadata generation would cost far more than it returns.
export function projectExcerpt(description: string, maxLength = 160): string {
  const plain = description
    // Fenced code blocks carry nothing summarisable.
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    // Images first (their alt text isn't prose), then links (keep the label).
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    // Headings, blockquotes, list bullets and table pipes.
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}[-*+]\s+/gm, "")
    .replace(/^\s{0,3}\d+\.\s+/gm, "")
    .replace(/\|/g, " ")
    // Emphasis markers.
    .replace(/[*_~]{1,3}/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) return plain;
  // Cut on a word boundary so the ellipsis doesn't land mid-word.
  const cut = plain.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
