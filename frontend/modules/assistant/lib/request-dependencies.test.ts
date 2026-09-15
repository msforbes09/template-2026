import { describe, expect, it } from "vitest";
import {
  buildDependencyMap,
  findMissingPrerequisites,
  findRefreshablePrerequisites,
} from "@/modules/assistant/lib/request-dependencies";
import type { PostmanCollection } from "@/modules/api-docs/types";

// The needs/produces edges are derived from the collection itself, so these
// fixtures are shaped like the real exports rather than minimal objects — the
// bug this module shipped with was a real-export shape the tests would have
// missed if they only covered the tidy case.

function collection(items: PostmanCollection["item"]): PostmanCollection {
  return { info: { name: "test", schema: "" }, item: items } as PostmanCollection;
}

const authenticate = {
  name: "Authenticate",
  request: {
    method: "POST",
    url: { raw: "{{base_url}}/token" },
    body: { mode: "raw" as const, raw: '{"client_id":"{{client_id}}"}' },
  },
  response: [{ name: "200", body: '{"access_token":"abc.def"}' }],
};

// The case that actually broke: the token is referenced ONLY in the auth block,
// never in a header the request declares. Reading headers alone made every
// eVerify verification call look dependency-free.
const verifyWithAuthBlock = {
  name: "Verify Personal Information",
  request: {
    method: "POST",
    url: { raw: "{{base_url}}/verify" },
    auth: { type: "bearer", bearer: [{ key: "token", value: "{{access_token}}" }] },
    body: { mode: "raw" as const, raw: '{"first_name":"Juan"}' },
  },
};

describe("buildDependencyMap", () => {
  it("links a token referenced in the auth block to the request whose example returns it", () => {
    const map = buildDependencyMap(collection([authenticate, verifyWithAuthBlock]));

    const verify = map.find((entry) => entry.name === "Verify Personal Information");
    expect(verify?.needs).toContain("access_token");

    const auth = map.find((entry) => entry.name === "Authenticate");
    expect(auth?.produces).toContain("access_token");
  });

  it("produces nothing when a request has no saved example responses", () => {
    const map = buildDependencyMap(
      collection([{ ...authenticate, response: [] }, verifyWithAuthBlock]),
    );
    expect(map.find((entry) => entry.name === "Authenticate")?.produces).toEqual([]);
  });

  it("walks nested folders", () => {
    const map = buildDependencyMap(
      collection([{ name: "Auth folder", item: [authenticate] }, verifyWithAuthBlock]),
    );
    expect(map.map((entry) => entry.name)).toContain("Authenticate");
  });

  it("ignores a non-JSON example body rather than throwing", () => {
    const map = buildDependencyMap(
      collection([{ ...authenticate, response: [{ name: "200", body: "<html>nope</html>" }] }]),
    );
    expect(map[0].produces).toEqual([]);
  });
});

describe("findMissingPrerequisites", () => {
  const spec = collection([authenticate, verifyWithAuthBlock]);
  // The base URL is a needed variable too — it's in every request's URL. These
  // cases are about the token, so it's filled in, the way it is in practice.
  const filled = { base_url: "https://api.example.gov.ph" };

  it("names the unfilled variable and the request that would fill it", () => {
    expect(
      findMissingPrerequisites({
        collection: spec,
        requestName: "Verify Personal Information",
        variables: filled,
      }),
    ).toEqual([{ variable: "access_token", producedBy: "Authenticate" }]);
  });

  it("reports nothing once the variable has a value", () => {
    expect(
      findMissingPrerequisites({
        collection: spec,
        requestName: "Verify Personal Information",
        variables: { ...filled, access_token: "already-set" },
      }),
    ).toEqual([]);
  });

  it("treats a whitespace-only value as unfilled", () => {
    const missing = findMissingPrerequisites({
      collection: spec,
      requestName: "Verify Personal Information",
      variables: { ...filled, access_token: "   " },
    });
    expect(missing).toEqual([{ variable: "access_token", producedBy: "Authenticate" }]);
  });

  it("matches the request name case-insensitively and ignores surrounding space", () => {
    expect(
      findMissingPrerequisites({
        collection: spec,
        requestName: "  verify personal information  ",
        variables: filled,
      }),
    ).toEqual([{ variable: "access_token", producedBy: "Authenticate" }]);
  });

  it("reports every unfilled variable, not just the interesting one", () => {
    expect(
      findMissingPrerequisites({
        collection: spec,
        requestName: "Verify Personal Information",
        variables: {},
      }).map((entry) => entry.variable),
    ).toEqual(["base_url", "access_token"]);
  });

  it("returns nothing for a request that isn't in the collection", () => {
    expect(
      findMissingPrerequisites({ collection: spec, requestName: "Nope", variables: {} }),
    ).toEqual([]);
  });

  it("reports a missing variable with no producer as unattributed", () => {
    const missing = findMissingPrerequisites({
      collection: collection([verifyWithAuthBlock]),
      requestName: "Verify Personal Information",
      variables: filled,
    });
    expect(missing).toEqual([{ variable: "access_token", producedBy: null }]);
  });

  it("never names a request as its own prerequisite", () => {
    // This example response would "produce" client_id, but it's the request's
    // own — attributing it to itself would tell the user to run it first.
    const selfish = {
      ...authenticate,
      response: [{ name: "200", body: '{"client_id":"loop","access_token":"abc"}' }],
    };
    expect(
      findMissingPrerequisites({
        collection: collection([selfish]),
        requestName: "Authenticate",
        variables: filled,
      }),
    ).toEqual([{ variable: "client_id", producedBy: null }]);
  });
});

describe("findRefreshablePrerequisites", () => {
  // 401/403 means the value may be present but stale, so presence is not the
  // test here — only whether something else can mint it.
  it("lists a producible variable even when it already has a value", () => {
    expect(
      findRefreshablePrerequisites({
        collection: collection([authenticate, verifyWithAuthBlock]),
        requestName: "Verify Personal Information",
      }),
    ).toEqual([{ variable: "access_token", producedBy: "Authenticate" }]);
  });

  it("skips variables nothing can produce", () => {
    expect(
      findRefreshablePrerequisites({
        collection: collection([verifyWithAuthBlock]),
        requestName: "Verify Personal Information",
      }),
    ).toEqual([]);
  });
});
