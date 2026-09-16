import "server-only";
import sanitizeHtml from "sanitize-html";

// Sanitises admin-authored CMS HTML before it is injected with
// dangerouslySetInnerHTML.
//
// modules/content/components/content-block.tsx renders content.body.en from the
// UNAUTHENTICATED Common API through four such sites, with no sanitiser
// anywhere on the path — splitSections() is pure string slicing and the only
// transform is a cosmetic tag-strip applied to heading TEXT, never to the
// markup that gets injected. The write path (createContent/updateContent) is
// admin-guarded and drives a TipTap editor, but a Server Action is an HTTP
// endpoint and the schema accepts `body: z.string().min(1)` — so any
// administrator, including a low-privilege content editor, or anything able to
// write the backing record, can store markup that then executes on
// /privacy-policy, /terms-of-service and /faqs for every anonymous visitor.
//
// An allow-list, not a block-list: anything not named here is dropped, so a
// tag or attribute nobody thought about fails closed. The list is TipTap's
// output surface — what the editor can actually produce — rather than a
// general-purpose HTML profile.

const ALLOWED_TAGS = [
  "p", "br", "hr", "span", "div",
  "strong", "b", "em", "i", "u", "s", "strike", "sub", "sup", "mark", "small",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "img",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
];

export function sanitizeContentHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "target", "rel", "name", "id"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      // `id` is what the on-this-page anchor nav links to, so headings keep it.
      "*": ["id", "class", "colspan", "rowspan", "start", "type"],
    },
    // javascript: and vbscript: are the whole point of restricting these.
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {
      // The editor's image extension can inline a pasted image as base64.
      img: ["http", "https", "data"],
    },
    // Never allow a relative URL to become a protocol-relative one.
    allowProtocolRelative: false,
    // An external link opened in a new tab gets the noopener/noreferrer it
    // needs; without it target="_blank" hands window.opener to the target.
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: attribs.target
          ? { ...attribs, rel: "noopener noreferrer" }
          : attribs,
      }),
    },
    // Drop the CONTENT of these too, not just the tags — otherwise the body of
    // a <script> survives as visible text on the page.
    nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe"],
    // Style attributes are dropped entirely (not in allowedAttributes): they
    // are a CSS-injection surface and the prose styling comes from PROSE_CLASS.
    allowedStyles: {},
  });
}
