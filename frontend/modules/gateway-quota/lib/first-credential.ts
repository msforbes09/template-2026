// Whether the dashboard should lead with "get your API credentials".
//
// `credentials_count` comes from GET /profile (egov-api-ws) and counts the
// caller's ACTIVE credentials, one per catalog they hold a key for. It is
// optional here so the UI stays correct against a backend that predates the
// field: an absent count says nothing rather than nagging a developer who may
// already hold a key.
//
// Gated on being able to mint one at all — a basic account cannot, so the
// nudge would send them somewhere they'd be refused.
export function needsFirstCredential(
  profile: { credentials_count?: number },
  canMintCredentials: boolean,
): boolean {
  return canMintCredentials && profile.credentials_count === 0;
}
