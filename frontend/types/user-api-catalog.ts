import type { GatewayCredential } from "@/types/gateway-credential";

// Response shape from the User API's GET /api-catalogs (UserApiCatalogListItem)
// — a lighter view than the admin-facing ApiCatalogListItem: no id,
// is_active, or credentials, just what a signed-in user is allowed to see.
export type UserApiCatalogListItem = {
  identifier: string;
  name: string | null;
  description: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Server-computed rating aggregates (2026-08-23). Optional until the
  // backend carrying them is deployed; an absent value reads as "no ratings"
  // rather than zero stars. See modules/reviews/lib/rating.ts.
  rating_avg?: number;
  rating_count?: number;
};

// Response shape from the User API's GET /api-catalogs/{identifier}
// (UserApiCatalog) — the list item plus spec/body, still no id, plus the
// caller's own active gateway credential for this catalog (or null).
export type UserApiCatalog = UserApiCatalogListItem & {
  body: string | null;
  spec: Record<string, unknown>;
  credential: GatewayCredential | null;
};
