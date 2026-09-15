// Parsers for the tool inputs and outputs the cards render.
//
// Everything here crosses the wire as `unknown` — model-generated, or shaped by
// a server tool whose return type the client can't see — so it is validated
// rather than cast. The contract is the same in every case: an unrecognised
// shape returns null (or an empty list), the card renders nothing, and the
// model's own prose stands. A malformed tool result must never take the
// conversation down with it.
//
// Kept apart from the components deliberately. These are pure data functions
// with real edge cases worth testing, and living in a "use client" .tsx beside
// JSX would drag next/link, the SSO wizard and the rest of the render tree into
// anything that wants to check one of them.

export type CatalogListItem = { identifier: string; name: string | null };

export function parseCatalogList(output: unknown): CatalogListItem[] {
  if (!output || typeof output !== "object") return [];
  const catalogs = (output as { catalogs?: unknown }).catalogs;
  if (!Array.isArray(catalogs)) return [];

  const items: CatalogListItem[] = [];
  for (const entry of catalogs) {
    if (!entry || typeof entry !== "object") continue;
    const { identifier, name } = entry as Record<string, unknown>;
    if (typeof identifier !== "string" || !identifier) continue;
    items.push({ identifier, name: typeof name === "string" ? name : null });
  }
  return items;
}

// Defaults to false: if the flag is missing or malformed, offer documentation
// rather than a test the visitor may not be able to run.
export function parseCanTest(output: unknown): boolean {
  if (!output || typeof output !== "object") return false;
  return (output as { canTest?: unknown }).canTest === true;
}

export type SignInPrompt = { reason: string | null };

export function parseSignInPrompt(output: unknown): SignInPrompt | null {
  if (!output || typeof output !== "object") return null;
  const { shown, reason } = output as Record<string, unknown>;
  if (shown !== true) return null;
  return { reason: typeof reason === "string" && reason ? reason : null };
}

// Options come from the model, so anything not a usable short string is
// dropped. Fewer than two survivors means there's no choice left to offer.
export function parseAskUser(input: unknown): { question: string; options: string[] } | null {
  if (!input || typeof input !== "object") return null;
  const { question, options } = input as Record<string, unknown>;
  if (typeof question !== "string" || !question.trim()) return null;
  if (!Array.isArray(options)) return null;

  const cleaned = options
    .filter((option): option is string => typeof option === "string")
    .map((option) => option.trim())
    .filter(Boolean)
    .slice(0, 5);

  return cleaned.length >= 2 ? { question, options: cleaned } : null;
}

export function parseTestInput(
  input: unknown,
): { identifier: string; requestName: string } | null {
  if (!input || typeof input !== "object") return null;
  const { identifier, requestName } = input as Record<string, unknown>;
  if (typeof identifier !== "string" || !identifier) return null;
  if (typeof requestName !== "string" || !requestName) return null;
  return { identifier, requestName };
}

export function parseCredentialInput(
  input: unknown,
): { identifier: string; action: "generate" | "revoke" } | null {
  if (!input || typeof input !== "object") return null;
  const { identifier, action } = input as Record<string, unknown>;
  if (typeof identifier !== "string" || !identifier) return null;
  if (action !== "generate" && action !== "revoke") return null;
  return { identifier, action };
}

// Several cards need only the catalog identifier off a tool input.
export function parseIdentifier(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  const { identifier } = input as Record<string, unknown>;
  return typeof identifier === "string" && identifier ? identifier : null;
}

// chooseTestTarget's two optional hints.
export function parseChooseTestTarget(input: unknown): {
  identifier?: string;
  justTested?: string;
} {
  if (!input || typeof input !== "object") return {};
  const { identifier, justTested } = input as Record<string, unknown>;
  return {
    identifier: typeof identifier === "string" && identifier ? identifier : undefined,
    justTested: typeof justTested === "string" && justTested ? justTested : undefined,
  };
}
