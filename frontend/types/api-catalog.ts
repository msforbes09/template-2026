// The list endpoint returns a lightweight representation — it omits the
// heavy `spec` and rich `body`; fetch a single entry to get those.
export type ApiCatalogListItem = {
  id: number;
  identifier: string;
  name: string | null;
  description: string | null;
  meta: Record<string, unknown> | null;
  is_active: 0 | 1;
  created_at: string | null;
  updated_at: string | null;
  // Server-computed rating aggregates (2026-08-23). Optional until the
  // backend carrying them is deployed; an absent value reads as "no ratings"
  // rather than zero stars. See modules/reviews/lib/rating.ts.
  rating_avg?: number;
  rating_count?: number;
};

export type ApiCatalog = ApiCatalogListItem & {
  // Rich content (HTML or markdown)
  body: string | null;
  // The API specification (OpenAPI/Swagger or Postman JSON export)
  spec: Record<string, unknown> | null;
};
