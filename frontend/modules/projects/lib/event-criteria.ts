import type { EgovEvent } from "@/types/project";

// Where an event publishes its judging criteria, read from the "Extras" JSON
// an admin fills in on the event form (`meta.criteria_route`).
//
// It lives on the event rather than in code because criteria belong to a
// programme, not to the portal: the 2026 hackathon scores on one rubric and
// whatever runs next will score on another. An event that hasn't set the key
// simply has no criteria to link to, and the link is omitted rather than
// pointing at some other event's rubric.
export type EventCriteriaLink = {
  href: string;
  // Set for an off-portal rubric (a PDF, a partner site), which needs
  // target/rel treatment the internal route doesn't.
  external: boolean;
};

// `meta` is free-form, admin-entered, and public, and this value is used as an
// href — so it is validated, not trusted. `javascript:` and `data:` URLs are
// the obvious XSS vector, and a protocol-relative "//evil.com" reads as a
// same-origin path but navigates off-site, so both are rejected. Anything that
// isn't a clean internal path or an http(s) URL yields no link at all.
export function eventCriteriaLink(event: EgovEvent | null | undefined): EventCriteriaLink | null {
  const raw = event?.meta?.criteria_route;
  if (typeof raw !== "string") return null;

  const value = raw.trim();
  if (!value) return null;

  // Internal route: exactly one leading slash. "//host" is protocol-relative
  // and off-site despite looking like a path.
  if (value.startsWith("/")) {
    return value.startsWith("//") ? null : { href: value, external: false };
  }

  // Absolute URL: only http(s). URL parsing rather than a prefix check so
  // that oddities like "java\nscript:" can't slip through.
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return { href: url.toString(), external: true };
    }
  } catch {
    // Not a parseable URL, and not a path — nothing safe to link to.
  }

  return null;
}
