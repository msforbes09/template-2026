import {
  collectVariableTokens,
  getAuthHeader,
  normalizeRequest,
  replaceJsonStringValue,
  substituteVariables,
} from "@/modules/api-docs/lib/postman";
import type { PostmanItem } from "@/modules/api-docs/types";

// How a collection request becomes an actual HTTP call.
//
// Extracted from TryItPanel so the assistant's test card runs the SAME request
// the docs page would. It was reimplemented there first and quietly diverged:
// it skipped the default Content-Type, ignored the user's saved body/header
// edits, and never patched in the exchange code — so "test it in chat" and
// "test it on the API page" could send different requests and get different
// results. Sharing the code is the only way to keep that honest.

export type HeaderRow = { key: string; value: string };

export type LiveResponse = {
  code: number;
  status: string;
  timeMs: number;
  sizeBytes: number;
  headers: HeaderRow[];
  body: string;
};

// The headers a request starts with: its auth header, its own declared
// headers, and — for a raw body with no Content-Type of its own — a JSON
// Content-Type. That last one matters: without it a POST goes out with no
// content type and the partner may reject it or parse it differently.
export function initialHeaders(item: PostmanItem): HeaderRow[] {
  const request = normalizeRequest(item.request);
  const authHeader = getAuthHeader(request.auth);
  const rows: HeaderRow[] = [
    ...(authHeader ? [authHeader] : []),
    ...request.headers.map((header) => ({ key: header.key, value: header.value })),
  ];
  if (
    request.bodyMode === "raw" &&
    request.bodyRaw &&
    !rows.some((row) => row.key.toLowerCase() === "content-type")
  ) {
    rows.push({ key: "Content-Type", value: "application/json" });
  }
  return rows;
}

// localStorage namespace for one request's saved body/header edits. Must match
// what CollectionViewer passes TryItPanel as `storagePrefix`, or the two read
// different drawers.
export function requestStoragePrefix(collectionId: string, requestId: string): string {
  return `egov-api-docs:${collectionId}:${requestId}`;
}

// eGov SSO's token request declares its exchange code as a literal placeholder
// in the body ("exchange_code": "generated_exchange_code"), NOT a {{token}} —
// so variable substitution alone never fills it. TryItPanel patches the JSON
// string directly; anything that sends this request has to do the same or the
// freshly minted code simply doesn't travel.
export function applyExchangeCode(body: string, exchangeCode: string | undefined): string {
  if (!exchangeCode) return body;
  return replaceJsonStringValue(body, "exchange_code", exchangeCode);
}

export type RequestPlan = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
};

// Turns a request plus the current variables into exactly what will be sent.
// `headers`/`body` accept the user's saved edits; omit them for the
// collection's documented defaults.
export function buildRequestPlan({
  item,
  variables,
  headers,
  body,
}: {
  item: PostmanItem;
  variables: Record<string, string>;
  headers?: HeaderRow[];
  body?: string;
}): RequestPlan {
  const request = normalizeRequest(item.request);
  const rows = headers ?? initialHeaders(item);
  const rawBody = body ?? request.bodyRaw;

  const resolvedHeaders: Record<string, string> = {};
  for (const row of rows) {
    const key = substituteVariables(row.key, variables).trim();
    if (key) resolvedHeaders[key] = substituteVariables(row.value, variables);
  }

  const resolvedBody = substituteVariables(rawBody, variables);
  return {
    method: request.method,
    url: substituteVariables(request.urlRaw, variables),
    headers: resolvedHeaders,
    // GET/HEAD carry no body regardless of what the collection declares.
    body:
      !["GET", "HEAD"].includes(request.method) && resolvedBody ? resolvedBody : undefined,
  };
}

// Performs the call and shapes the response the way the docs page reports it.
// Throws only on a transport-level failure (CORS, DNS, offline) — an HTTP
// error status is a normal, reportable outcome.
export async function executeRequestPlan(plan: RequestPlan): Promise<LiveResponse> {
  const startedAt = performance.now();
  const res = await fetch(plan.url, {
    method: plan.method,
    headers: plan.headers,
    body: plan.body,
  });
  const text = await res.text();
  return {
    code: res.status,
    status: res.statusText,
    timeMs: Math.round(performance.now() - startedAt),
    sizeBytes: new TextEncoder().encode(text).length,
    headers: Array.from(res.headers.entries()).map(([key, value]) => ({ key, value })),
    body: text,
  };
}

// Every {{token}} one request references — url, body, its own headers, AND the
// header its auth config implies.
//
// That last part is easy to miss and matters: eVerify declares {{access_token}}
// only inside `auth: { type: "bearer" }`, never as an explicit header. Collect
// tokens without it and the request looks like it depends on nothing but a
// base URL, which is wrong in the exact case people hit first.
export function requestVariableTokens(item: PostmanItem): string[] {
  const request = normalizeRequest(item.request);
  const auth = getAuthHeader(request.auth);
  return collectVariableTokens(
    request.urlRaw,
    request.bodyRaw,
    ...request.headers.map((header) => `${header.key} ${header.value}`),
    auth ? `${auth.key} ${auth.value}` : "",
  );
}
