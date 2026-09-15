import type {
  PostmanAuth,
  PostmanAuthAttribute,
  PostmanCollection,
  PostmanDescription,
  PostmanItem,
  PostmanItemGroup,
  PostmanQueryParam,
  PostmanRequest,
  PostmanUrl,
  PostmanVariable,
} from "@/modules/api-docs/types";

export function isItemGroup(entry: PostmanItem | PostmanItemGroup): entry is PostmanItemGroup {
  return "item" in entry && Array.isArray((entry as PostmanItemGroup).item);
}

// An API catalog's `spec` field holds either a Postman v2.1 export (which
// CollectionViewer renders) or an OpenAPI document (which it can't) —
// detect by shape rather than trusting a `meta.format` hint that may be
// missing or stale.
export function asPostmanCollection(spec: Record<string, unknown>): PostmanCollection | null {
  const info = spec.info as { name?: unknown } | undefined;
  if (info && typeof info.name === "string" && Array.isArray(spec.item)) {
    return spec as unknown as PostmanCollection;
  }
  return null;
}

export function getDescriptionText(description: PostmanDescription | undefined): string {
  if (!description) return "";
  if (typeof description === "string") return description;
  return description.content ?? "";
}

export function getRawUrl(url: PostmanUrl | undefined): string {
  if (!url) return "";
  if (typeof url === "string") return url;
  if (url.raw) return url.raw;
  const host = Array.isArray(url.host) ? url.host.join(".") : (url.host ?? "");
  const path = Array.isArray(url.path)
    ? url.path.map((segment) => (typeof segment === "string" ? segment : (segment.value ?? ""))).join("/")
    : (url.path ?? "");
  return [host, path].filter(Boolean).join("/");
}

export function getQueryParams(url: PostmanUrl | undefined): PostmanQueryParam[] {
  if (!url || typeof url === "string") return [];
  return url.query ?? [];
}

export function getPathVariables(url: PostmanUrl | undefined): PostmanVariable[] {
  if (!url || typeof url === "string") return [];
  return url.variable ?? [];
}

export type NormalizedHeader = { key: string; value: string; description?: string };

export type NormalizedRequest = {
  method: string;
  urlRaw: string;
  description: string;
  headers: NormalizedHeader[];
  bodyMode: string | null;
  bodyRaw: string;
  auth: PostmanAuth | null;
  queryParams: PostmanQueryParam[];
  pathVariables: PostmanVariable[];
};

function authAttributes(auth: PostmanAuth, key: string): PostmanAuthAttribute[] {
  const attrs = auth[key];
  return Array.isArray(attrs) ? attrs : [];
}

function attrValue(attrs: PostmanAuthAttribute[], key: string): string {
  const found = attrs.find((attr) => attr.key === key);
  return found?.value == null ? "" : String(found.value);
}

// The Authorization (or API key) header a request's auth config implies —
// shown in the docs and seeded into the tester's header rows.
export function getAuthHeader(auth: PostmanAuth | null | undefined): NormalizedHeader | null {
  if (!auth || auth.type === "noauth") return null;
  if (auth.type === "bearer") {
    const token = attrValue(authAttributes(auth, "bearer"), "token");
    return { key: "Authorization", value: `Bearer ${token}` };
  }
  if (auth.type === "basic") {
    const attrs = authAttributes(auth, "basic");
    const username = attrValue(attrs, "username");
    const password = attrValue(attrs, "password");
    // Encoding happens at send time (credentials usually hold {{variables}} here).
    return { key: "Authorization", value: `Basic ${username}:${password}` };
  }
  if (auth.type === "apikey") {
    const attrs = authAttributes(auth, "apikey");
    const inLocation = attrValue(attrs, "in");
    if (inLocation === "query") return null;
    return { key: attrValue(attrs, "key") || "X-Api-Key", value: attrValue(attrs, "value") };
  }
  return null;
}

export function authLabel(auth: PostmanAuth | null | undefined): string | null {
  if (!auth || auth.type === "noauth") return null;
  const labels: Record<string, string> = {
    bearer: "Bearer token",
    basic: "Basic auth",
    apikey: "API key",
    oauth2: "OAuth 2.0",
    oauth1: "OAuth 1.0",
    digest: "Digest auth",
    awsv4: "AWS Signature v4",
    hawk: "Hawk",
    ntlm: "NTLM",
    edgegrid: "EdgeGrid",
  };
  return labels[auth.type] ?? auth.type;
}

export function normalizeRequest(request: PostmanRequest): NormalizedRequest {
  if (typeof request === "string") {
    return {
      method: "GET",
      urlRaw: request,
      description: "",
      headers: [],
      bodyMode: null,
      bodyRaw: "",
      auth: null,
      queryParams: [],
      pathVariables: [],
    };
  }

  const headers: NormalizedHeader[] = Array.isArray(request.header)
    ? request.header
        .filter((header) => !header.disabled)
        .map((header) => ({
          key: header.key,
          value: String(header.value),
          description: getDescriptionText(header.description) || undefined,
        }))
    : [];

  const body = request.body;
  let bodyMode: string | null = null;
  let bodyRaw = "";
  if (body && !body.disabled) {
    bodyMode = body.mode ?? null;
    if (body.mode === "raw") {
      bodyRaw = body.raw ?? "";
    } else if (body.mode === "urlencoded") {
      bodyRaw = (body.urlencoded ?? [])
        .filter((param) => !param.disabled)
        .map((param) => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value ?? "")}`)
        .join("&");
    } else if (body.mode === "graphql") {
      bodyRaw = JSON.stringify(body.graphql ?? {}, null, 2);
    }
  }

  return {
    method: request.method?.toUpperCase() ?? "GET",
    urlRaw: getRawUrl(request.url),
    description: getDescriptionText(request.description),
    headers,
    bodyMode: bodyMode === "raw" && !bodyRaw ? null : bodyMode,
    bodyRaw,
    auth: request.auth ?? null,
    queryParams: getQueryParams(request.url).filter((param) => !param.disabled),
    pathVariables: getPathVariables(request.url),
  };
}

const VARIABLE_RE = /\{\{([^{}]+)\}\}/g;

export function collectVariableTokens(...texts: string[]): string[] {
  const tokens = new Set<string>();
  for (const text of texts) {
    for (const match of text.matchAll(VARIABLE_RE)) {
      tokens.add(match[1]);
    }
  }
  return Array.from(tokens);
}

export function substituteVariables(text: string, variables: Record<string, string>): string {
  return text.replace(VARIABLE_RE, (whole, name: string) => {
    const value = variables[name];
    return value !== undefined && value !== "" ? value : whole;
  });
}

// Best-effort swap of a JSON string field's value in a raw request body —
// for sample bodies that ship a literal placeholder instead of a
// {{variable}} token (e.g. Postman's own "generated_exchange_code" example
// value), so a value produced elsewhere in the UI can still seed that
// field. Leaves the body untouched if the key isn't present.
export function replaceJsonStringValue(text: string, key: string, value: string): string {
  const re = new RegExp(`("${key}"\\s*:\\s*")[^"]*(")`);
  return re.test(text) ? text.replace(re, `$1${value}$2`) : text;
}

// Split a string into plain-text and {{variable}} parts for token highlighting.
export function splitVariableTokens(text: string): { text: string; isVariable: boolean }[] {
  const parts: { text: string; isVariable: boolean }[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(VARIABLE_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) parts.push({ text: text.slice(lastIndex, index), isVariable: false });
    parts.push({ text: match[0], isVariable: true });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex), isVariable: false });
  return parts;
}

// Response keys match variable names ignoring case and separators — e.g. a
// response's `access_token` updates a `{{accessToken}}` variable.
function normalizeKeyName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Walk a successful response's JSON breadth-first (so a shallow key beats a
// deeper duplicate) and return the values whose keys match known variables.
export function captureVariablesFromResponse(
  bodyText: string,
  variableKeys: string[],
): Record<string, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return {};
  }

  const found = new Map<string, string>();
  const queue: unknown[] = [parsed];
  let visited = 0;
  while (queue.length > 0 && visited < 5000) {
    const node = queue.shift();
    visited += 1;
    if (Array.isArray(node)) {
      queue.push(...node);
      continue;
    }
    if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          const normalized = normalizeKeyName(key);
          if (!found.has(normalized)) found.set(normalized, String(value));
        } else if (value && typeof value === "object") {
          queue.push(value);
        }
      }
    }
  }

  const captured: Record<string, string> = {};
  for (const key of variableKeys) {
    const value = found.get(normalizeKeyName(key));
    if (value !== undefined) captured[key] = value;
  }
  return captured;
}

export function prettyJson(text: string | null | undefined): string {
  if (!text) return "";
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function shellQuote(text: string): string {
  return `'${text.replaceAll("'", `'\\''`)}'`;
}

export function buildCurl(input: {
  method: string;
  url: string;
  headers: NormalizedHeader[];
  bodyRaw: string;
  bodyMode: string | null;
}): string {
  const lines = [`curl --request ${input.method} \\`, `  --url ${shellQuote(input.url)}`];
  for (const header of input.headers) {
    lines[lines.length - 1] += " \\";
    lines.push(`  --header ${shellQuote(`${header.key}: ${header.value}`)}`);
  }
  if (input.bodyRaw && !["GET", "HEAD"].includes(input.method)) {
    if (input.bodyMode === "raw" && !input.headers.some((h) => h.key.toLowerCase() === "content-type")) {
      lines[lines.length - 1] += " \\";
      lines.push(`  --header ${shellQuote("Content-Type: application/json")}`);
    }
    lines[lines.length - 1] += " \\";
    lines.push(`  --data ${shellQuote(input.bodyRaw)}`);
  }
  return lines.join("\n");
}
