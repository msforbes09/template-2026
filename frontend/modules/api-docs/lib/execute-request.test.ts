import { describe, expect, it } from "vitest";
import {
  applyExchangeCode,
  buildRequestPlan,
  initialHeaders,
  requestStoragePrefix,
  requestVariableTokens,
} from "@/modules/api-docs/lib/execute-request";
import type { PostmanItem } from "@/modules/api-docs/types";

// This module is the single request-building path shared by the docs Try-it
// panel and the assistant's test card. It exists because the assistant's first
// version reimplemented it and diverged in four ways that changed the wire
// request — so these tests are guarding a convergence, and a regression here
// breaks both surfaces at once.

const tokenRequest = {
  name: "Generates Access Token",
  request: {
    method: "POST",
    url: { raw: "{{base_url}}/api/token" },
    body: {
      mode: "raw" as const,
      raw: '{"exchange_code":"generated_exchange_code","partner_code":"{{partner_code}}"}',
    },
  },
} as PostmanItem;

const bearerRequest = {
  name: "Verify Personal Information",
  request: {
    method: "POST",
    url: { raw: "{{base_url}}/verify" },
    auth: { type: "bearer", bearer: [{ key: "token", value: "{{access_token}}" }] },
    body: { mode: "raw" as const, raw: "{}" },
  },
} as PostmanItem;

describe("initialHeaders", () => {
  it("adds a JSON Content-Type for a raw body that declares none", () => {
    // Without this the POST goes out with no content type and the partner may
    // reject it or parse it differently — one of the four original divergences.
    expect(initialHeaders(tokenRequest)).toContainEqual({
      key: "Content-Type",
      value: "application/json",
    });
  });

  it("does not override a Content-Type the request already declares", () => {
    const form = {
      request: {
        method: "POST",
        url: { raw: "/x" },
        header: [{ key: "Content-Type", value: "application/x-www-form-urlencoded" }],
        body: { mode: "raw" as const, raw: "a=1" },
      },
    } as PostmanItem;

    const contentTypes = initialHeaders(form).filter(
      (row) => row.key.toLowerCase() === "content-type",
    );
    expect(contentTypes).toEqual([
      { key: "Content-Type", value: "application/x-www-form-urlencoded" },
    ]);
  });

  it("includes the header implied by an auth block", () => {
    expect(initialHeaders(bearerRequest)).toContainEqual({
      key: "Authorization",
      value: "Bearer {{access_token}}",
    });
  });

  it("adds no Content-Type to a GET with no body", () => {
    const get = { request: { method: "GET", url: { raw: "/x" } } } as PostmanItem;
    expect(initialHeaders(get)).toEqual([]);
  });
});

describe("buildRequestPlan", () => {
  const variables = {
    base_url: "https://api.example.gov.ph",
    partner_code: "TEST_AGENCY",
    access_token: "tok-123",
  };

  it("substitutes variables into url, headers and body", () => {
    const plan = buildRequestPlan({ item: tokenRequest, variables });

    expect(plan.method).toBe("POST");
    expect(plan.url).toBe("https://api.example.gov.ph/api/token");
    expect(plan.body).toContain('"partner_code":"TEST_AGENCY"');
    expect(plan.headers["Content-Type"]).toBe("application/json");
  });

  it("resolves the auth header's variable too", () => {
    const plan = buildRequestPlan({ item: bearerRequest, variables });
    expect(plan.headers.Authorization).toBe("Bearer tok-123");
  });

  it("honours the user's saved header and body edits over the defaults", () => {
    // The assistant's first version ignored these, so "test it in chat" and
    // "test it on the API page" could send different requests.
    const plan = buildRequestPlan({
      item: tokenRequest,
      variables,
      headers: [{ key: "X-Custom", value: "{{partner_code}}" }],
      body: '{"edited":true}',
    });

    expect(plan.headers).toEqual({ "X-Custom": "TEST_AGENCY" });
    expect(plan.body).toBe('{"edited":true}');
  });

  it("never sends a body on GET or HEAD", () => {
    const get = {
      request: { method: "GET", url: { raw: "/x" }, body: { mode: "raw" as const, raw: "{}" } },
    } as PostmanItem;
    expect(buildRequestPlan({ item: get, variables }).body).toBeUndefined();
  });

  it("drops a header whose key resolves to nothing", () => {
    const plan = buildRequestPlan({
      item: tokenRequest,
      variables,
      headers: [{ key: "  ", value: "x" }, { key: "Keep", value: "y" }],
    });
    expect(plan.headers).toEqual({ Keep: "y" });
  });

  it("leaves an unresolved token in place rather than blanking it", () => {
    // A visible {{token}} in the request is a legible failure; a silently empty
    // value produces a confusing 4xx instead.
    const plan = buildRequestPlan({ item: tokenRequest, variables: {} });
    expect(plan.url).toContain("{{base_url}}");
  });
});

describe("applyExchangeCode", () => {
  it("patches the literal placeholder, which variable substitution can't reach", () => {
    const patched = applyExchangeCode(
      '{"exchange_code":"generated_exchange_code","scope":"SSO_AUTHENTICATION"}',
      "fresh-code",
    );
    expect(patched).toContain('"exchange_code":"fresh-code"');
    expect(patched).toContain('"scope":"SSO_AUTHENTICATION"');
  });

  it("leaves the body untouched when there's no code to apply", () => {
    const body = '{"exchange_code":"generated_exchange_code"}';
    expect(applyExchangeCode(body, undefined)).toBe(body);
  });
});

describe("requestVariableTokens", () => {
  it("finds a token declared only in the auth block", () => {
    // The miss that made every eVerify verification call look dependency-free.
    expect(requestVariableTokens(bearerRequest)).toContain("access_token");
  });

  it("finds tokens in the url and body", () => {
    const tokens = requestVariableTokens(tokenRequest);
    expect(tokens).toContain("base_url");
    expect(tokens).toContain("partner_code");
  });

  it("returns nothing for a request with no placeholders", () => {
    const plain = {
      request: { method: "GET", url: { raw: "https://example.gov.ph/health" } },
    } as PostmanItem;
    expect(requestVariableTokens(plain)).toEqual([]);
  });
});

describe("requestStoragePrefix", () => {
  it("namespaces a request's saved edits by collection and request", () => {
    // Must match what CollectionViewer passes TryItPanel, or the two read
    // different drawers of saved edits.
    expect(requestStoragePrefix("everify", "req-1")).toBe("egov-api-docs:everify:req-1");
  });
});
