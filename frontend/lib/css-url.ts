// Embedding a backend-supplied URL into a CSS `url()` value.
//
// React assigns inline styles through the CSSOM rather than by writing CSS
// text, so a bad value fails to parse instead of escaping into a new rule —
// but the value still comes from outside this app, and the house rule is to
// sanitize at the point of injection rather than trust the medium.
//
// Two checks, both refusals rather than rewrites:
//
//   - the scheme must be http or https, which rejects `data:` payloads and
//     anything exotic;
//   - the string must not contain a character that could close the url() token
//     early — quotes, parentheses, backslashes or whitespace.
//
// The second one REFUSES rather than percent-encoding, deliberately. These
// URLs are signed (see ProjectPhoto in types/project.ts) and re-encoding one
// would invalidate its signature, turning a cosmetic problem into a broken
// image. A legitimate signed CDN URL contains none of those characters, so
// refusing costs nothing and rewriting could cost everything.
const SAFE_SCHEMES = new Set(["http:", "https:"]);
const TOKEN_BREAKING = /["'()\\\s]/;

export function cssUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (!SAFE_SCHEMES.has(parsed.protocol)) return null;
  if (TOKEN_BREAKING.test(value)) return null;

  return `url("${value}")`;
}
