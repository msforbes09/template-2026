// Where the user is when they open the assistant.
//
// The widget floats on every (site) page, so "how do I authenticate with this
// one?" asked while reading an API's docs is the most natural question there
// is — and until this existed the answer was "which API do you mean?", because
// nothing about the page ever reached the model.
//
// The client sends a PATH and nothing else. It is not trusted: this parser only
// recognises route shapes it knows, an identifier still has to match a real
// published catalog server-side, and only the server's own catalog name is ever
// interpolated into the prompt. Anything unrecognised is `other`, never a guess
// — see the note in app/api/chat/route.ts on why that matters.

export type AssistantPageContext =
  | { kind: "catalog"; identifier: string }
  | { kind: "usage" }
  | { kind: "profile" }
  | { kind: "dashboard" }
  // The public showcase and the citizen's own entries. One kind for both: the
  // useful questions differ by whether they are SIGNED IN, not by which of the
  // two paths they are on, and the opener already branches on that.
  | { kind: "projects" }
  | { kind: "other" };

// Catalog docs live at two paths: the public one and the signed-in Try-it view.
// Both are "the user is looking at this API".
const CATALOG_ROUTES = [/^\/api-catalogs\/([^/]+)$/, /^\/dashboard\/api-catalogs\/([^/]+)$/];

// Kept deliberately tight. An identifier is a slug in this catalog ("egov-sso",
// "everify"), so anything with a space, a quote or punctuation is not one, and
// rejecting it here means malformed input never reaches the lookup.
const IDENTIFIER = /^[a-z0-9][a-z0-9-]{0,63}$/i;

export function parseAssistantPathname(pathname: string): AssistantPageContext {
  // Strip the query and hash — neither identifies a route, and both are places
  // arbitrary text can hide.
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";

  // The ONE exception, and it stays an exception: /dashboard/developers holds
  // two tabs, and which one is open is genuinely which page the reader is on.
  // Matched against the exact literal rather than parsed out — a whitelist of
  // one keeps the "no arbitrary text from the query" rule intact.
  const onUsageTab = /[?&]tab=usage(?:&|$)/.test(pathname);

  for (const pattern of CATALOG_ROUTES) {
    const identifier = path.match(pattern)?.[1];
    if (identifier) {
      const decoded = safeDecode(identifier);
      if (decoded && IDENTIFIER.test(decoded)) return { kind: "catalog", identifier: decoded };
      return { kind: "other" };
    }
  }

  // /dashboard/usage now redirects into the developers route's Usage tab. Both
  // are recognised: the old path can still be in a bookmark or mid-redirect,
  // and the new one is where the reader actually lands.
  if (path === "/dashboard/usage") return { kind: "usage" };
  if (path === "/dashboard/developers") {
    // Only the Usage tab is "usage". The catalog tab is the default, so
    // claiming otherwise would give usage-flavoured help to most visitors.
    return onUsageTab ? { kind: "usage" } : { kind: "other" };
  }
  // Checked before the bare /dashboard/profile so the edit page isn't swallowed
  // by "other".
  if (path.startsWith("/dashboard/profile")) return { kind: "profile" };
  if (path === "/projects" || path.startsWith("/projects/")) return { kind: "projects" };
  if (path.startsWith("/dashboard/projects")) return { kind: "projects" };
  if (path === "/dashboard") return { kind: "dashboard" };
  return { kind: "other" };
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    // A malformed escape sequence throws; it also can't be a real identifier.
    return null;
  }
}
