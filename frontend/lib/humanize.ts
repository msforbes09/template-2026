// Turn a machine token into a Title Case label a person would read:
//
//   "GatewayCredential" → "Gateway Credential"   (WS morph-map model names)
//   "for_assessment"    → "For Assessment"       (statuses, events, tags)
//   "ApiCatalog"        → "API Catalog"          (known acronyms stay upper)
//
// Handles PascalCase, snake_case and kebab-case. Anything else — a namespaced
// class, text that already has spaces — is passed through untouched so an
// unexpected value still shows exactly what the API sent.

const ACRONYMS: Record<string, string> = { api: "API", otp: "OTP", sso: "SSO", id: "ID" };

const PASCAL_CASE = /^[A-Z][a-z0-9]*(?:[A-Z][a-z0-9]*)*$/;
const DELIMITED = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

export function humanize(value: string): string {
  let words: string[];
  if (PASCAL_CASE.test(value)) {
    words = value.match(/[A-Z][a-z0-9]*/g) ?? [];
  } else if (DELIMITED.test(value)) {
    words = value.split(/[_-]/);
  } else {
    return value;
  }

  return words
    .map((word) => {
      const lower = word.toLowerCase();
      return ACRONYMS[lower] ?? lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
