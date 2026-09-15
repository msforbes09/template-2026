import { describe, expect, it } from "vitest";
import { getEndpointDetail, summarizeCatalogSpec } from "@/modules/assistant/lib/summarize-catalog";

// These two views exist to solve opposite problems, and the tests are mostly
// about keeping them opposite: the LIST must stay small and visibly incomplete,
// the DETAIL must stay complete. Blurring that is what once had the model
// inventing an OAuth body from the first rows of a truncated description.

const longDescription = "A".repeat(500);

function spec(overrides: Record<string, unknown> = {}) {
  return {
    info: { name: "eGov SSO", schema: "https://schema.getpostman.com/json/collection/v2.1.0/" },
    variable: [{ key: "base_url", value: "" }, { key: "partner_code", value: "TEST_AGENCY" }],
    item: [
      {
        name: "Generates Access Token",
        request: {
          method: "POST",
          url: { raw: "{{base_url}}/api/token" },
          description: longDescription,
          header: [{ key: "Content-Type", value: "application/json" }],
          body: { mode: "raw", raw: '{"partner_code":"{{partner_code}}"}' },
        },
        response: [{ name: "200 OK", code: 200, status: "OK", body: '{"access_token":"abc"}' }],
      },
    ],
    ...overrides,
  };
}

describe("summarizeCatalogSpec", () => {
  it("flattens endpoints with method, url and the declared variables", () => {
    const result = summarizeCatalogSpec(spec());

    expect(result.endpoints).toHaveLength(1);
    expect(result.endpoints[0]).toMatchObject({
      name: "Generates Access Token",
      method: "POST",
      url: "{{base_url}}/api/token",
    });
    expect(result.variables).toEqual(["base_url", "partner_code"]);
    expect(result.unsupportedFormat).toBe(false);
  });

  it("trims a long description AND says so in the text itself", () => {
    const [endpoint] = summarizeCatalogSpec(spec()).endpoints;

    expect(endpoint.description.length).toBeLessThan(longDescription.length);
    // The marker is the point: a silently-cut description reads as complete,
    // and the model then answers from the fragment instead of fetching more.
    expect(endpoint.description).toContain("call getApiEndpoint");
  });

  it("leaves a short description alone", () => {
    const short = summarizeCatalogSpec(
      spec({
        item: [
          {
            name: "Ping",
            request: { method: "GET", url: { raw: "{{base_url}}/ping" }, description: "Health check." },
          },
        ],
      }),
    );
    expect(short.endpoints[0].description).toBe("Health check.");
  });

  it("flags that a body exists without carrying it", () => {
    const [endpoint] = summarizeCatalogSpec(spec()).endpoints;

    expect(endpoint.hasRequestBody).toBe(true);
    // A missing body and no body must not look the same to the model, but the
    // list still doesn't ship the payload.
    expect(JSON.stringify(endpoint)).not.toContain("partner_code\":\"{{partner_code}}");
  });

  it("records the folder path for nested requests", () => {
    const nested = summarizeCatalogSpec(
      spec({
        item: [
          {
            name: "Records",
            item: [
              {
                name: "SAAODB",
                item: [{ name: "Get SAAODB Records", request: { method: "GET", url: { raw: "/x" } } }],
              },
            ],
          },
        ],
      }),
    );
    expect(nested.endpoints[0].group).toBe("Records > SAAODB");
  });

  it("caps a pathological collection and reports the truncation", () => {
    const many = Array.from({ length: 80 }, (_, index) => ({
      name: `Request ${index}`,
      request: { method: "GET", url: { raw: "/x" } },
    }));
    const result = summarizeCatalogSpec(spec({ item: many }));

    expect(result.endpoints).toHaveLength(60);
    expect(result.truncated).toBe(true);
  });

  it("distinguishes an unsupported spec format from an empty one", () => {
    // An OpenAPI document would flatten to nothing; saying "no endpoints"
    // there would be a lie, so the two cases carry different flags.
    const openapi = summarizeCatalogSpec({ openapi: "3.0.0", paths: {} });
    expect(openapi.unsupportedFormat).toBe(true);

    const empty = summarizeCatalogSpec({});
    expect(empty.unsupportedFormat).toBe(false);
    expect(empty.endpoints).toEqual([]);

    expect(summarizeCatalogSpec(null).endpoints).toEqual([]);
  });
});

describe("getEndpointDetail", () => {
  it("returns the full description, body and examples", () => {
    const result = getEndpointDetail(spec(), "Generates Access Token");
    expect("detail" in result).toBe(true);
    if (!("detail" in result)) return;

    // Not trimmed to the list's budget, and no truncation marker.
    expect(result.detail.description).toBe(longDescription);
    expect(result.detail.description).not.toContain("call getApiEndpoint");
    // The {{tokens}} survive: resolving them here would misrepresent the call.
    expect(result.detail.body).toBe('{"partner_code":"{{partner_code}}"}');
    expect(result.detail.headers).toEqual([{ key: "Content-Type", value: "application/json" }]);
    expect(result.detail.examples).toEqual([
      { name: "200 OK", status: "OK", code: 200, body: '{"access_token":"abc"}' },
    ]);
  });

  it("matches the request name case-insensitively", () => {
    expect("detail" in getEndpointDetail(spec(), "  generates access token ")).toBe(true);
  });

  it("lists the real names when asked for one that doesn't exist", () => {
    const result = getEndpointDetail(spec(), "Generate Token");
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;

    // The available list is what lets the model recover instead of guessing
    // another name.
    expect(result.available).toEqual(["Generates Access Token"]);
  });

  it("reports an unsupported spec rather than pretending the endpoint is missing", () => {
    const result = getEndpointDetail({ openapi: "3.0.0" }, "anything");
    expect("error" in result && result.error).toContain("Postman collection");
  });

  it("finds a request nested inside folders", () => {
    const nested = spec({
      item: [{ name: "Auth", item: [{ name: "Token", request: { method: "POST", url: { raw: "/t" } } }] }],
    });
    expect("detail" in getEndpointDetail(nested, "Token")).toBe(true);
  });
});
