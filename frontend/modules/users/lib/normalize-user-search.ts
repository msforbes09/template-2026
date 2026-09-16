// Mobile numbers are stored canonically as +639XXXXXXXXX and the WS search is
// an exact blind-index match, so a mobile typed any other way would silently
// find nothing. When the input is recognizably a PH mobile — under separators
// (spaces, dashes, dots) it reduces to 9XXXXXXXXX with an optional 0, 63 or
// +63 prefix — send the canonical form; anything else (names, emails,
// partials) passes through untouched.
export function normalizeUserSearch(input: string): string {
  const compact = input.replace(/[\s.-]/g, "");
  const match = /^(?:\+?63|0)?(9\d{9})$/.exec(compact);
  return match ? `+63${match[1]}` : input;
}
