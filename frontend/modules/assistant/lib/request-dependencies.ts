"use client";

import { captureVariablesFromResponse, isItemGroup } from "@/modules/api-docs/lib/postman";
import { requestVariableTokens } from "@/modules/api-docs/lib/execute-request";
import { buildTree } from "@/modules/api-docs/lib/tree";
import type {
  PostmanCollection,
  PostmanItem,
  PostmanItemGroup,
} from "@/modules/api-docs/types";

// Which request in a collection has to run before which other one.
//
// The collection already encodes this, nobody has to declare it: a request
// NEEDS every {{token}} it references, and a request PRODUCES every variable
// its saved example responses contain. eVerify's verification call references
// {{access_token}}; its authenticate call's example response has an
// access_token field. That's the edge — no per-catalog configuration.
//
// Detected exactly the way a real run would fill the variable: the same
// captureVariablesFromResponse the try-it panel uses after a live response,
// pointed at the example instead. So "this request can produce X" means "if
// you ran it, X would be captured", not a guess from its name.
//
// Limits worth knowing: a collection with no saved example responses yields no
// edges, and this can't see a dependency that only exists in prose. It stays
// silent in those cases rather than inventing one.

export type RequestDependency = {
  name: string;
  needs: string[];
  produces: string[];
};

export type MissingPrerequisite = {
  // The unfilled variable, e.g. "access_token".
  variable: string;
  // The request that would fill it, if one is identifiable.
  producedBy: string | null;
};

function everyVariableKey(collection: PostmanCollection, items: RequestDependency[]): string[] {
  const keys = new Set<string>();
  for (const variable of collection.variable ?? []) {
    const key = variable.key ?? variable.id;
    if (key) keys.add(key);
  }
  for (const item of items) for (const need of item.needs) keys.add(need);
  return Array.from(keys);
}

function walk(entries: (PostmanItem | PostmanItemGroup)[], out: PostmanItem[] = []): PostmanItem[] {
  for (const entry of entries) {
    if (isItemGroup(entry)) walk(entry.item, out);
    else out.push(entry);
  }
  return out;
}

export function buildDependencyMap(collection: PostmanCollection): RequestDependency[] {
  const items = walk(collection.item);

  // First pass: what each request needs. Needed before the second pass, since
  // the candidate keys for capture are the union of every referenced token.
  const partial: RequestDependency[] = items.map((item) => ({
    name: item.name ?? "(unnamed request)",
    // Includes the auth-implied header — see requestVariableTokens.
    needs: requestVariableTokens(item),
    produces: [],
  }));

  const candidates = everyVariableKey(collection, partial);

  // Second pass: what each request's example responses would fill in.
  return partial.map((entry, index) => {
    const produced = new Set<string>();
    for (const example of items[index].response ?? []) {
      if (!example.body) continue;
      for (const key of Object.keys(captureVariablesFromResponse(example.body, candidates))) {
        produced.add(key);
      }
    }
    return { ...entry, produces: Array.from(produced) };
  });
}

// The variables this request needs that aren't filled in, each paired with the
// request that would fill it. A request never counts as its own prerequisite.
export function findMissingPrerequisites({
  collection,
  requestName,
  variables,
}: {
  collection: PostmanCollection;
  requestName: string;
  variables: Record<string, string>;
}): MissingPrerequisite[] {
  const map = buildDependencyMap(collection);
  const target = map.find(
    (entry) => entry.name.trim().toLowerCase() === requestName.trim().toLowerCase(),
  );
  if (!target) return [];

  const missing: MissingPrerequisite[] = [];
  for (const variable of target.needs) {
    if (variables[variable]?.trim()) continue;
    const producer = map.find(
      (entry) => entry.name !== target.name && entry.produces.includes(variable),
    );
    missing.push({ variable, producedBy: producer?.name ?? null });
  }
  return missing;
}

// For a request that ran and came back 401/403: the variables it depends on
// that another request can mint. The value may be present but expired — a
// token is the usual case — so blankness isn't the test here.
export function findRefreshablePrerequisites({
  collection,
  requestName,
}: {
  collection: PostmanCollection;
  requestName: string;
}): MissingPrerequisite[] {
  const map = buildDependencyMap(collection);
  const target = map.find(
    (entry) => entry.name.trim().toLowerCase() === requestName.trim().toLowerCase(),
  );
  if (!target) return [];

  const refreshable: MissingPrerequisite[] = [];
  for (const variable of target.needs) {
    const producer = map.find(
      (entry) => entry.name !== target.name && entry.produces.includes(variable),
    );
    if (producer) refreshable.push({ variable, producedBy: producer.name });
  }
  return refreshable;
}

// Convenience for callers that only have the tree.
export function requestNames(collection: PostmanCollection): string[] {
  return buildTree(collection.item).flatMap(function names(node): string[] {
    return node.kind === "request" ? [node.name] : node.children.flatMap(names);
  });
}
