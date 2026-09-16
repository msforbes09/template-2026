// Serialises a JSON-LD graph for injection into an inline <script> tag.
//
// JSON.stringify() alone is NOT safe here, which is the trap all three JSON-LD
// components fell into. Inside `<script>`, the HTML tokenizer — not the JSON
// parser — decides where the element ends: it scans for the literal `</script`
// and stops there, whatever the surrounding quoting. A backend-supplied string
// (a project name, a catalog title) reaching the graph verbatim therefore ends
// the script early and everything after it is parsed as HTML.
//
// Escaping `<` as < defuses that: it is an ordinary JSON string escape, so
// the value a consumer parses back is byte-identical, but the tokenizer never
// sees a tag. `>` and `&` go with it so no entity or comment form (`<!--`,
// `]]>`) can be assembled either.
//
// U+2028/U+2029 are legal in JSON strings but were line terminators in JS
// before ES2019; escaping them keeps the payload safe if it is ever read by an
// older parser rather than only by a crawler.
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
