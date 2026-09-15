import { describe, it, expect } from "vitest";
import { sanitizeContentHtml } from "@/lib/sanitize-content";

describe("sanitizeContentHtml", () => {
  it("removes a script tag and its body", () => {
    const out = sanitizeContentHtml('<p>Policy</p><script>alert(document.cookie)</script>');
    expect(out).not.toContain("script");
    // The body must go too — otherwise the code survives as visible text.
    expect(out).not.toContain("alert");
    expect(out).toContain("<p>Policy</p>");
  });

  it("strips inline event handlers", () => {
    const out = sanitizeContentHtml('<img src="x" onerror="alert(1)">');
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("alert");
  });

  it("strips a javascript: URL", () => {
    const out = sanitizeContentHtml('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain("javascript:");
    expect(out).toContain("click");
  });

  it("removes iframe, object and form", () => {
    const out = sanitizeContentHtml(
      '<iframe src="https://evil.test"></iframe><object data="x"></object><form action="/x"><input name="p"></form>',
    );
    expect(out).not.toMatch(/iframe|object|form|input/);
  });

  it("drops style attributes", () => {
    const out = sanitizeContentHtml('<p style="position:fixed;top:0">x</p>');
    expect(out).not.toContain("style");
  });

  it("keeps the markup a TipTap document actually produces", () => {
    const html =
      '<h2 id="scope">Scope</h2><p><strong>Bold</strong> and <em>italic</em>.</p>' +
      '<ul><li>One</li><li>Two</li></ul>' +
      '<blockquote><p>Quoted</p></blockquote><pre><code>code()</code></pre>' +
      '<table><tbody><tr><th colspan="2">H</th></tr><tr><td>C</td></tr></tbody></table>';
    const out = sanitizeContentHtml(html);
    for (const fragment of ["<h2", 'id="scope"', "<strong>", "<em>", "<ul>", "<li>", "<blockquote>", "<pre>", "<code>", "<table>", 'colspan="2"']) {
      expect(out).toContain(fragment);
    }
  });

  it("keeps ordinary links and images", () => {
    const out = sanitizeContentHtml(
      '<a href="https://example.com" title="Example">Example</a><img src="https://x.test/a.png" alt="a">',
    );
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('src="https://x.test/a.png"');
    expect(out).toContain('alt="a"');
  });

  it("adds noopener noreferrer to a new-tab link", () => {
    const out = sanitizeContentHtml('<a href="https://x.test" target="_blank">x</a>');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("allows a data: URI only on an image", () => {
    const png = "data:image/png;base64,iVBORw0KGgo=";
    expect(sanitizeContentHtml(`<img src="${png}">`)).toContain("data:image/png");
    expect(sanitizeContentHtml('<a href="data:text/html,<script>1</script>">x</a>')).not.toContain(
      "data:text/html",
    );
  });

  it("blocks protocol-relative URLs", () => {
    expect(sanitizeContentHtml('<a href="//evil.test/x">x</a>')).not.toContain("//evil.test");
  });
});
