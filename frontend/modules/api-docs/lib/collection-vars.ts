import type { PostmanCollection } from "@/modules/api-docs/types";

// Variable metadata read off a collection. Extracted from CollectionViewer so
// anything else hosting the try-it experience — the assistant's test card —
// can feed VariablesManager the same options rather than a degraded copy.

// A collection may define the same key several times (e.g. baseUrl for staging
// vs local) — collect every value per key, in file order. Keys with more than
// one value render as a select in VariablesManager.
export function variableOptions(collection: PostmanCollection): Record<string, string[]> {
  const options: Record<string, string[]> = {};
  for (const variable of collection.variable ?? []) {
    const key = variable.key ?? variable.id;
    if (!key) continue;
    const value = variable.value == null ? "" : String(variable.value);
    options[key] ??= [];
    if (value !== "" && !options[key].includes(value)) options[key].push(value);
  }
  return options;
}

// Default each key to its FIRST defined value.
export function initialVariables(options: Record<string, string[]>): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const [key, values] of Object.entries(options)) {
    variables[key] = values[0] ?? "";
  }
  return variables;
}
