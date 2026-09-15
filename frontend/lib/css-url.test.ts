import { describe, it, expect } from "vitest";
import { cssUrl } from "@/lib/css-url";

describe("cssUrl", () => {
  it("wraps a plain https URL", () => {
    expect(cssUrl("https://cdn.example.com/a.jpg")).toBe('url("https://cdn.example.com/a.jpg")');
  });

  it("passes a signed CDN URL through byte for byte", () => {
    // The whole point: these carry a signature, so the value that comes back
    // must be identical to the value that went in. Any re-encoding here would
    // invalidate the signature and break the image.
    const signed =
      "https://cdn.example.com/egov/staging/82e00438.jpg?Expires=1787805709&Signature=eHL09ARz~ot3-cma_0z0S7&Key-Pair-Id=K2BWWX3YMJH0EO";
    expect(cssUrl(signed)).toBe(`url("${signed}")`);
  });

  it("returns null for empty input", () => {
    expect(cssUrl(null)).toBeNull();
    expect(cssUrl(undefined)).toBeNull();
    expect(cssUrl("")).toBeNull();
  });

  it("refuses a non-http scheme", () => {
    expect(cssUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")).toBeNull();
    expect(cssUrl("javascript:alert(1)")).toBeNull();
    expect(cssUrl("file:///etc/passwd")).toBeNull();
  });

  it("refuses anything that is not a URL at all", () => {
    expect(cssUrl("not a url")).toBeNull();
    expect(cssUrl("/relative/path.jpg")).toBeNull();
  });

  it("refuses characters that could close the url() token early", () => {
    // The injection shape this guard exists for.
    expect(cssUrl('https://cdn.example.com/a.jpg");background:url(evil')).toBeNull();
    expect(cssUrl("https://cdn.example.com/a.jpg')")).toBeNull();
    expect(cssUrl("https://cdn.example.com/a(1).jpg")).toBeNull();
    expect(cssUrl("https://cdn.example.com/a\\b.jpg")).toBeNull();
  });

  it("refuses whitespace, including a newline that could start a new declaration", () => {
    expect(cssUrl("https://cdn.example.com/a b.jpg")).toBeNull();
    expect(cssUrl("https://cdn.example.com/a.jpg\n  color: red")).toBeNull();
  });
});
