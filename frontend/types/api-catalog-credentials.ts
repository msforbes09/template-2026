// Response shape from the User API's POST /api-catalogs/generate-credentials
// (one-time per account). `credentials` keys vary per catalog (e.g.
// "partner-code"/"partner-secret") — the API doesn't declare a fixed schema.
export type ApiCatalogCredentialSet = {
  name: string | null;
  credentials: Record<string, string>;
};
