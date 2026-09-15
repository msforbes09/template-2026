import {
  asPostmanCollection,
  authLabel,
  isItemGroup,
  normalizeRequest,
} from "@/modules/api-docs/lib/postman";
import type { PostmanCollection, PostmanItem, PostmanItemGroup } from "@/modules/api-docs/types";

// A catalog's `spec` is an entire Postman collection — every header, body,
// example response and script. Handing that to the model verbatim would burn
// the context window on one tool call and drown the parts that matter, so the
// assistant only ever sees this flattened summary: what each request is called,
// what it does, and where it goes.
//
// The request NAME is the load-bearing field. It's what testApiCatalogEndpoint
// takes as input, and it's how the widget finds the item to run again on the
// client — so it has to survive into the model's context verbatim.

export type CatalogEndpointSummary = {
  name: string;
  method: string;
  // Raw URL with its {{variables}} left in — those placeholders are meaningful
  // (the base URL one is blank until the citizen holds a credential), so
  // resolving them here would misrepresent the request.
  url: string;
  description: string;
  // Folder path when the collection nests requests, e.g. "Records > SAAODB".
  group: string;
  // Whether this endpoint sends a payload. The list never carries the body
  // itself — this is the flag that tells the model one exists to go and fetch.
  hasRequestBody: boolean;
};

// Caps the flattening. A pathological collection shouldn't be able to push
// hundreds of endpoints into a prompt.
const MAX_ENDPOINTS = 60;

// A request's description in these collections IS the documentation — the eGov
// SSO token endpoint's is ~1,500 characters of request-body table, response
// codes and notes. So the two views treat it very differently.
//
// The list trims hard, and short is safer than nearly-complete: at 600 chars
// the model got the first rows of that body table, took them for the whole
// contract, and produced a payload with exchange_code and scope while silently
// dropping partner_code and partner_secret. A summary that obviously is one
// sends it to fetch the rest.
const LIST_DESCRIPTION_CHARS = 200;

// Appended when a description was cut, so the truncation is visible in the
// text itself rather than only in a sibling field the model may skim past.
const TRUNCATION_MARKER = " … [truncated — call getApiEndpoint for the full documentation]";
// The detail view is the one place that must NOT meaningfully trim — cutting
// it here is what sent the model to generic OAuth knowledge in the first place.
const DETAIL_DESCRIPTION_CHARS = 8000;
const BODY_CHARS = 4000;
const EXAMPLE_BODY_CHARS = 1200;
const MAX_EXAMPLES = 3;

function flatten(
  entries: (PostmanItem | PostmanItemGroup)[],
  trail: string[],
  out: CatalogEndpointSummary[],
): void {
  for (const entry of entries) {
    if (out.length >= MAX_ENDPOINTS) return;

    if (isItemGroup(entry)) {
      flatten(entry.item, [...trail, entry.name ?? ""].filter(Boolean), out);
      continue;
    }

    // normalizeRequest, not the raw item: a Postman request can be a bare URL
    // string instead of an object, and this is where that's already flattened.
    const request = normalizeRequest(entry.request);
    const truncated = request.description.length > LIST_DESCRIPTION_CHARS;
    out.push({
      name: entry.name ?? "(unnamed request)",
      method: request.method,
      url: request.urlRaw,
      description:
        request.description.slice(0, LIST_DESCRIPTION_CHARS) + (truncated ? TRUNCATION_MARKER : ""),
      group: trail.join(" > "),
      // Flags that this endpoint HAS a payload the list isn't showing. Without
      // it the model has no signal that a body exists at all, and a missing
      // body reads the same as no body.
      hasRequestBody: Boolean(request.bodyRaw),
    });
  }
}

// One endpoint in full — everything needed to actually call it, rather than
// just know it exists. This is what the list view deliberately omits.
export type CatalogEndpointDetail = CatalogEndpointSummary & {
  auth: string | null;
  headers: { key: string; value: string }[];
  queryParams: { key: string; value: string; description: string }[];
  pathVariables: { key: string; value: string }[];
  bodyMode: string | null;
  // The raw payload template, {{tokens}} intact — the single most useful thing
  // for "how do I call this", and the thing whose absence sent the model to
  // generic OAuth boilerplate.
  body: string | null;
  // Saved example responses, which document the response shape and status
  // codes better than prose.
  examples: { name: string; status: string | null; code: number | null; body: string | null }[];
};

function findItem(
  entries: (PostmanItem | PostmanItemGroup)[],
  name: string,
): PostmanItem | null {
  const wanted = name.trim().toLowerCase();
  for (const entry of entries) {
    if (isItemGroup(entry)) {
      const found = findItem(entry.item, name);
      if (found) return found;
      continue;
    }
    if ((entry.name ?? "").trim().toLowerCase() === wanted) return entry;
  }
  return null;
}

export function getEndpointDetail(
  spec: Record<string, unknown> | null,
  requestName: string,
): { detail: CatalogEndpointDetail } | { error: string; available: string[] } {
  const collection = spec ? asPostmanCollection(spec) : null;
  if (!collection) {
    return { error: "This API's spec isn't a Postman collection, so it has no endpoint detail.", available: [] };
  }

  const item = findItem(collection.item, requestName);
  if (!item) {
    const available: CatalogEndpointSummary[] = [];
    flatten(collection.item, [], available);
    return {
      error: `No request named "${requestName}" in this API.`,
      available: available.map((endpoint) => endpoint.name),
    };
  }

  const request = normalizeRequest(item.request);
  return {
    detail: {
      name: item.name ?? "(unnamed request)",
      method: request.method,
      url: request.urlRaw,
      // Full, not trimmed to the list's budget — see the note on the caps.
      description: request.description.slice(0, DETAIL_DESCRIPTION_CHARS),
      group: "",
      hasRequestBody: Boolean(request.bodyRaw),
      auth: authLabel(request.auth),
      headers: request.headers.map((header) => ({ key: header.key, value: header.value })),
      queryParams: request.queryParams.map((param) => ({
        key: param.key ?? "",
        value: param.value ?? "",
        description:
          typeof param.description === "string"
            ? param.description
            : (param.description?.content ?? ""),
      })),
      pathVariables: request.pathVariables.map((variable) => ({
        key: variable.key ?? "",
        value: variable.value == null ? "" : String(variable.value),
      })),
      bodyMode: request.bodyMode,
      body: request.bodyRaw ? request.bodyRaw.slice(0, BODY_CHARS) : null,
      examples: (item.response ?? []).slice(0, MAX_EXAMPLES).map((example) => ({
        name: example.name ?? "(unnamed example)",
        status: example.status ?? null,
        code: example.code ?? null,
        body: example.body ? example.body.slice(0, EXAMPLE_BODY_CHARS) : null,
      })),
    },
  };
}

export function summarizeCatalogSpec(spec: Record<string, unknown> | null): {
  endpoints: CatalogEndpointSummary[];
  // The {{tokens}} the collection declares, which are what a caller has to
  // supply. Without these the model can't explain what needs filling in.
  variables: string[];
  truncated: boolean;
  // Non-Postman specs (an OpenAPI document, say) can't be flattened — say so
  // rather than returning an empty list the model would read as "no endpoints".
  unsupportedFormat: boolean;
} {
  if (!spec || Object.keys(spec).length === 0) {
    return { endpoints: [], variables: [], truncated: false, unsupportedFormat: false };
  }

  const collection: PostmanCollection | null = asPostmanCollection(spec);
  if (!collection) {
    return { endpoints: [], variables: [], truncated: false, unsupportedFormat: true };
  }

  const endpoints: CatalogEndpointSummary[] = [];
  flatten(collection.item, [], endpoints);

  const variables: string[] = [];
  for (const variable of collection.variable ?? []) {
    const key = variable.key ?? variable.id;
    if (key && !variables.includes(key)) variables.push(key);
  }

  return {
    endpoints,
    variables,
    truncated: endpoints.length >= MAX_ENDPOINTS,
    unsupportedFormat: false,
  };
}
