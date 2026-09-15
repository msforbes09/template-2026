import { describe, it, expect } from "vitest";
import { serializeJsonLd } from "@/lib/json-ld";

describe("serializeJsonLd", () => {
  it("escapes a </script> break-out in a backend-supplied name", () => {
    // The exact payload from the review: a project name is user-entered, passes
    // the 150-char schema, and reaches the graph verbatim.
    const out = serializeJsonLd({ name: 'My App</script><img src=x onerror=alert(1)>' });
    expect(out).not.toContain("</script");
    expect(out).not.toContain("<img");
    expect(out).toContain("\\u003c");
  });

  it("escapes every character that can start a tag, entity or comment", () => {
    const out = serializeJsonLd({ a: "<", b: ">", c: "&" });
    expect(out).not.toMatch(/[<>&]/);
  });

  it("round-trips to the identical value", () => {
    // The escaping must be lossless — a crawler has to read back what was meant.
    const value = { name: 'a<b>c&d"e', nested: { list: ["</script>", "ok"] } };
    expect(JSON.parse(serializeJsonLd(value))).toEqual(value);
  });

  it("escapes the legacy JS line terminators", () => {
    const out = serializeJsonLd({ a: "x y z" });
    expect(out).toContain("\\u2028");
    expect(out).toContain("\\u2029");
    expect(JSON.parse(out)).toEqual({ a: "x y z" });
  });

  it("leaves ordinary content untouched", () => {
    expect(serializeJsonLd({ "@type": "WebSite", name: "Example" })).toBe(
      '{"@type":"WebSite","name":"Example"}',
    );
  });
});
