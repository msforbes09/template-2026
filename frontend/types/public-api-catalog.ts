import type { RatingBreakdown } from "@/types/review";

// Response shape from the Common API's GET /api-catalogs (PublicApiCatalogItem)
// — unauthenticated, used for public/marketing listings. Lighter than the
// admin and signed-in-user views: identifier, name, description, meta only.
export type PublicApiCatalogItem = {
  identifier: string;
  name: string | null;
  description: string | null;
  meta: Record<string, unknown> | null;
  // Server-computed aggregates, added 2026-08-23. `rating_avg` is 0 when
  // unreviewed, so `rating_count` is the field that decides whether there is
  // anything to show. Optional: the backend carrying them is merged but not
  // yet deployed, and an absent value must read as "no ratings" rather than
  // rendering zero stars.
  rating_avg?: number;
  rating_count?: number;
};

// Response shape from the Common API's GET /api-catalogs/{identifier} — the
// anonymous detail view: the list item plus the full spec and integration
// body, and nothing else. Deliberately has no `id` and no `credential`
// (contrast UserApiCatalog), and the spec's base-URL variable is blank by
// design — the gateway base URL is only ever delivered alongside a
// credential, so an anonymous visitor can read the whole spec but can't
// learn where to send requests. 404s for an unknown or inactive catalog.
export type PublicApiCatalog = PublicApiCatalogItem & {
  body: string | null;
  spec: Record<string, unknown>;
  // Show only — the per-star histogram. Absent on a list item.
  rating_breakdown?: RatingBreakdown;
};
