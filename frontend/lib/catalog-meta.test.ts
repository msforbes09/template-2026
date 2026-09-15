import { describe, expect, it } from "vitest";
import {
  getMetaExtensionShows,
  hasMetaExtension,
  FACE_LIVENESS_SESSION_GENERATOR_EXTENSION,
  EXCHANGE_CODE_GENERATOR_EXTENSION,
} from "@/lib/catalog-meta";

// meta is admin-entered free-form JSON, so every case here is something a real
// entry could contain. The one that matters most is repetition: the same
// extension declared twice with different `show` values is not a mistake, it's
// how an extension gets placed above more than one request.

// eVerify's real meta.extensions, as returned by the public catalog endpoint.
const everifyMeta = {
  extensions: [
    { name: "faceliveness-session-generator", show: "Verify Personal Information" },
    { name: "faceliveness-session-generator", show: "QR Verify" },
  ],
};

describe("getMetaExtensionShows", () => {
  it("returns every placement of a repeated extension", () => {
    // The bug this replaced: .find() returned only the first, so the widget
    // appeared on "Verify Personal Information" and QR Verify silently had no
    // way to get a session id.
    expect(
      getMetaExtensionShows(everifyMeta, FACE_LIVENESS_SESSION_GENERATOR_EXTENSION),
    ).toEqual(["Verify Personal Information", "QR Verify"]);
  });

  it("returns nothing for an extension this catalog doesn't declare", () => {
    expect(getMetaExtensionShows(everifyMeta, EXCHANGE_CODE_GENERATOR_EXTENSION)).toEqual([]);
  });

  it("keeps the declared order", () => {
    const meta = {
      extensions: [
        { name: "x", show: "Third" },
        { name: "x", show: "First" },
      ],
    };
    expect(getMetaExtensionShows(meta, "x")).toEqual(["Third", "First"]);
  });

  it("de-duplicates an accidentally repeated placement", () => {
    const meta = {
      extensions: [
        { name: "x", show: "Same" },
        { name: "x", show: "Same" },
      ],
    };
    // Otherwise the widget would render twice, stacked, above one request.
    expect(getMetaExtensionShows(meta, "x")).toEqual(["Same"]);
  });

  it("drops entries whose show is missing or unusable", () => {
    const meta = {
      extensions: [
        { name: "x" },
        { name: "x", show: "" },
        { name: "x", show: 42 },
        { name: "x", show: "Real" },
      ],
    };
    // An extension naming no request has nowhere to appear.
    expect(getMetaExtensionShows(meta, "x")).toEqual(["Real"]);
  });

  it("survives meta that isn't the shape it should be", () => {
    for (const meta of [null, {}, { extensions: null }, { extensions: "nope" }, { extensions: [1, "a", null] }]) {
      expect(getMetaExtensionShows(meta as Record<string, unknown> | null, "x")).toEqual([]);
    }
  });
});

describe("hasMetaExtension", () => {
  it("is true when the extension is declared at all", () => {
    expect(hasMetaExtension(everifyMeta, FACE_LIVENESS_SESSION_GENERATOR_EXTENSION)).toBe(true);
  });

  it("is true even when the entry names no request", () => {
    // The catalog still needs the prerequisite; it just has no placement. The
    // assistant asks this question, and answering false would tell the model an
    // API needs no preparation when it does.
    expect(hasMetaExtension({ extensions: [{ name: "x" }] }, "x")).toBe(true);
  });

  it("is false for an undeclared extension or malformed meta", () => {
    expect(hasMetaExtension(everifyMeta, EXCHANGE_CODE_GENERATOR_EXTENSION)).toBe(false);
    expect(hasMetaExtension(null, "x")).toBe(false);
    expect(hasMetaExtension({ extensions: {} }, "x")).toBe(false);
  });
});
