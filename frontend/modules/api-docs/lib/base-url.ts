import type { PostmanCollection } from "@/modules/api-docs/types";

// Gateway-proxied catalogs ship their spec with the host stripped out: the
// collection still declares a base-URL variable, but its value is blank on
// purpose. The real base URL is only ever delivered with a credential —
// `credentials.base_url` when one is generated, `credential.public.base_url`
// on the authenticated catalog show — never in the spec. So the viewer has
// to recognize that blank variable and either fill it from the credential or
// explain why the host is missing, rather than rendering "/api/auth" with
// nothing in front of it.
//
// The key isn't consistent across catalogs (eVerify and eGovPH SSO declare
// `base_url`, Compass declares `baseUrl`), so match on the normalized name
// rather than one literal spelling.
function isBaseUrlKey(key: string): boolean {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "") === "baseurl";
}

// Base-URL variables the collection declares with no value. A catalog that
// isn't gateway-proxied (e.g. eGovChain, which points at its own public RPC
// host) ships a real value and doesn't appear here — nothing to fill in, no
// notice to show.
export function blankBaseUrlKeys(collection: PostmanCollection): string[] {
  const keys = new Set<string>();
  const filled = new Set<string>();
  for (const variable of collection.variable ?? []) {
    const key = variable.key ?? variable.id;
    if (!key || !isBaseUrlKey(key)) continue;
    keys.add(key);
    if (variable.value != null && String(variable.value) !== "") filled.add(key);
  }
  for (const key of filled) keys.delete(key);
  return Array.from(keys);
}

// Overlays a known base URL onto every blank base-URL variable. Applied on
// top of the persisted values (rather than folded into the collection
// defaults) so it also wins over a stored empty string — usePersistentVariables
// writes the whole variable map on any edit, so a user who touched an
// unrelated variable before generating a credential would otherwise have a
// saved `base_url: ""` shadowing the default forever.
export function withBaseUrl(
  variables: Record<string, string>,
  keys: string[],
  baseUrl: string | null | undefined,
): Record<string, string> {
  if (!baseUrl || keys.length === 0) return variables;
  const filled = keys.filter((key) => !variables[key]);
  if (filled.length === 0) return variables;
  return { ...variables, ...Object.fromEntries(filled.map((key) => [key, baseUrl])) };
}
