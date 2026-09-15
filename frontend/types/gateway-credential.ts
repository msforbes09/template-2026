// Response shape from the User API's per-catalog credential resource
// (POST/DELETE /api-catalogs/{identifier}/credential, and embedded as
// UserApiCatalog.credential). Never exposes secret hashes — secret_hint
// values are pre-masked by the backend (e.g. "9b2e****...****4f10"); the
// plaintext is only ever returned once, in the POST response's separate
// `credentials` field.
export type GatewayCredential = {
  uuid: string;
  platform: string;
  name: string | null;
  secret_hint: Record<string, string> | null;
  // Non-secret fields, keyed per catalog (e.g. "pubkey"). Carries
  // `base_url` for gateway-proxied catalogs — the address to send requests
  // to, deliberately absent from the catalog's spec (whose host variable is
  // blank) and delivered only alongside a credential. It stays readable
  // here for as long as the credential is active, unlike the plaintext
  // secret; see modules/api-docs/lib/base-url.ts.
  public: Record<string, string>;
  is_active: 0 | 1;
  last_used_at: string | null;
  created_at: string;
};
