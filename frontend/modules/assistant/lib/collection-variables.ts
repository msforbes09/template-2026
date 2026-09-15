"use client";

import type { PostmanCollection } from "@/modules/api-docs/types";

// Read/write access to the collection variables the API docs' Test tab keeps
// in localStorage (usePersistentVariables). The assistant shares that store
// rather than keeping its own, so a prerequisite it runs in chat — an eGov
// exchange code, say — lands in the same {{exchange_code}} the Test tab and
// TestRequestCard resolve against.
//
// Deliberately plain functions, not the hook: these are called from event
// handlers inside cards that may not be mounted when the value changes, and
// the hook's subscription model is for components that render off it.

function storageKey(collection: PostmanCollection): string {
  // Same key CollectionViewer derives — must match exactly or the assistant
  // writes into a store nothing else reads.
  const collectionId = collection.info._postman_id ?? collection.info.name;
  return `egov-api-docs:variables:${collectionId}`;
}

export function readCollectionVariables(collection: PostmanCollection): Record<string, string> {
  try {
    const raw = localStorage.getItem(storageKey(collection));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v ?? "")]),
      );
    }
  } catch {
    // blocked or malformed storage — behave as if nothing was saved
  }
  return {};
}

// Merges `patch` over whatever is stored. Merge rather than replace: the Test
// tab may hold a client id/secret the user set by hand, and a prerequisite run
// must not wipe them.
//
// Yes, this persists secret values to localStorage — that is what the docs'
// Variables panel already does with hand-entered credentials, so it's the same
// store and the same exposure, not a new one. The alternative (a separate,
// non-persisted store for the assistant) would mean a code minted in chat
// couldn't be used by the Test tab, which defeats the point.
export function writeCollectionVariables(
  collection: PostmanCollection,
  patch: Record<string, string>,
): void {
  try {
    const next = { ...readCollectionVariables(collection), ...patch };
    localStorage.setItem(storageKey(collection), JSON.stringify(next));
  } catch {
    // Storage blocked. The prerequisite still ran and its value is shown in
    // the card; it just won't auto-fill the Test tab.
  }
}

// The variable names the collection itself declares, in its own order. These
// are the {{tokens}} its requests reference, so they're the set worth editing —
// as opposed to whatever happens to be sitting in localStorage.
export function declaredVariableKeys(collection: PostmanCollection): string[] {
  const keys: string[] = [];
  for (const variable of collection.variable ?? []) {
    const key = variable.key ?? variable.id;
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

// Postman variable names and credential field names describe the same things
// with different spellings — clientId vs client_id vs CLIENT_ID. Compare on a
// normalized form so a mint's fields land in the right variables.
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Which minted credential fields correspond to variables this collection
// actually declares. Returns the patch to write, keyed by the COLLECTION's
// spelling — writing the credential's spelling instead would create a second,
// unreferenced variable that no request resolves against.
export function matchCredentialToVariables(
  collection: PostmanCollection,
  credentialFields: Record<string, string>,
): Record<string, string> {
  const declared = declaredVariableKeys(collection);
  const byNormalized = new Map(declared.map((key) => [normalizeKey(key), key]));

  const patch: Record<string, string> = {};
  for (const [field, value] of Object.entries(credentialFields)) {
    const target = byNormalized.get(normalizeKey(field));
    if (target) patch[target] = value;
  }
  return patch;
}

// Overlays a credential's public extras onto variables that are still blank.
// Generalises what withBaseUrl does for the base URL alone: eVerify's liveness
// widget resolves {{public_api_key}}, and that value lives in exactly the same
// place. Only fills blanks, so a value the user set by hand always wins.
export function withCredentialExtras(
  variables: Record<string, string>,
  extras: Record<string, string>,
): Record<string, string> {
  const patch: Record<string, string> = {};
  for (const [key, value] of Object.entries(extras)) {
    if (value && !variables[key]) patch[key] = value;
  }
  return Object.keys(patch).length > 0 ? { ...variables, ...patch } : variables;
}
