import { Braces, icons, type LucideIcon } from "lucide-react";

const iconsByName = icons as Record<string, LucideIcon>;

// meta is admin-entered free-form JSON (see ApiCatalogForm's JsonEditor) —
// pull a key out defensively rather than trusting it's present or a string.
export function metaString(meta: Record<string, unknown> | null, key: string): string | null {
  const value = meta?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

// meta.icon is expected to hold a lucide-react export name (e.g.
// "MessagesSquare"); fall back to a generic icon for entries that don't set
// one yet, or set one that doesn't match a real export.
export function resolveMetaIcon(meta: Record<string, unknown> | null): LucideIcon {
  const name = metaString(meta, "icon");
  return (name && iconsByName[name]) || Braces;
}

// meta.extensions is an admin-entered array of { name, show } entries that
// toggle extra client-side UI on the catalog page. `name` identifies which
// extension; `show` names the API doc request/tab it should render above
// (matched against that request's Postman item name).
//
// The SAME extension may appear more than once with different `show` values —
// eVerify declares faceliveness-session-generator twice, for "Verify Personal
// Information" and for "QR Verify", because both requests need a session id.
// So the array is a list of placements, not a set of unique extensions.
function metaExtensionEntries(
  meta: Record<string, unknown> | null,
  name: string,
): { show: unknown }[] {
  const extensions = meta?.extensions;
  if (!Array.isArray(extensions)) return [];
  return extensions.filter(
    (item): item is { show: unknown } =>
      typeof item === "object" && item !== null && (item as { name?: unknown }).name === name,
  );
}

// Every request this extension should render above. Empty means "not enabled
// for this catalog"; entries with no usable `show` are dropped, since an
// extension that names no request has nowhere to appear.
export function getMetaExtensionShows(
  meta: Record<string, unknown> | null,
  name: string,
): string[] {
  const shows: string[] = [];
  for (const entry of metaExtensionEntries(meta, name)) {
    if (typeof entry.show === "string" && entry.show && !shows.includes(entry.show)) {
      shows.push(entry.show);
    }
  }
  return shows;
}

// Whether this catalog enables the extension at all, regardless of placement.
export function hasMetaExtension(meta: Record<string, unknown> | null, name: string): boolean {
  return metaExtensionEntries(meta, name).length > 0;
}

// Defined here (not in the "use client" component that consumes it) because
// every export of a "use client" module — not just the component — becomes
// a client-reference proxy when imported from a Server Component, so a
// plain string constant re-exported from there resolves to a function, not
// its value.
export const EXCHANGE_CODE_GENERATOR_EXTENSION = "egov-exchange-code-generator";

// Identifies modules/site/components/face-liveness-session-generator.tsx's
// extension entry in meta.extensions. Kept here for the same reason as
// EXCHANGE_CODE_GENERATOR_EXTENSION above (plain-string export from a
// non-"use client" module resolves to a function if re-exported from a
// "use client" file). No "egov-" prefix — this is eVerify-specific.
export const FACE_LIVENESS_SESSION_GENERATOR_EXTENSION = "faceliveness-session-generator";

// Logo shown in place of the catalog name on the doc page header. Same assets
// the landing page's service cards use (modules/landing/components/service-cards.tsx);
// intrinsic w/h let next/image reserve the right aspect ratio. `mark: true` is a
// square emblem (e.g. the DBM seal for Compass) that reads as an icon beside the
// name rather than a standalone wordmark. Catalogs without an entry fall back to
// their text name.
export type CatalogLogo = { src: string; w: number; h: number; mark?: boolean };

// Keyed by the *normalized* catalog identifier — see normalizeCatalogKey. The
// backend identifier "egov-sso" is confirmed; the rest mirror the logo filename
// stems (logo-<stem>.png). Normalizing on both sides means hyphen/casing drift
// in the real identifier (e.g. "egov-ai" vs "egovai") still resolves.
const catalogLogos: Record<string, CatalogLogo> = {
  egovsso: { src: "/services/logo-egov-sso.png", w: 854, h: 244 },
  everify: { src: "/services/logo-everify.png", w: 803, h: 119 },
  emessage: { src: "/services/logo-emessage.png", w: 1074, h: 194 },
  egovai: { src: "/services/logo-egovai.png", w: 935, h: 286 },
  egovpay: { src: "/services/logo-egovpay.png", w: 1037, h: 260 },
  egovchain: { src: "/services/logo-egovchain.png", w: 1155, h: 260 },
  compass: { src: "/services/logo-compass.png", w: 212, h: 212, mark: true },
  // Points at the platforms set rather than public/services: eReport already
  // ships its wordmark there for the landing page's ecosystem bento, and the
  // catalog is the same brand. Referenced, not copied, so there's one file.
  ereport: { src: "/platforms/logo-ereport.png", w: 308, h: 95 },
};

function normalizeCatalogKey(identifier: string): string {
  return identifier.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getCatalogLogo(identifier: string): CatalogLogo | null {
  return catalogLogos[normalizeCatalogKey(identifier)] ?? null;
}
