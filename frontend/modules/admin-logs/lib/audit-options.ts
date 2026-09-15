// The audit-log filter vocab, mirrored by hand from the WS — there is no
// endpoint that lists either set.
//
// Events: `config/audit.php` → `events` (owen-it/laravel-auditing), plus
// `accessed` (app/Http/Middleware/LogPiiAccess.php — PII reads) and `sync`
// (auditSync() on Administrator roles / Role permissions).
// Subject types: every model that uses the Auditable trait, by its morph-map
// short name (egov-api-ws/project/app/Providers/AppServiceProvider.php).
// Add here when the backend audits a new model — audit-options.test.ts pins the
// set, so it fails rather than drifting silently the way it did before.

export const AUDIT_EVENTS = [
  "created",
  "updated",
  "deleted",
  "restored",
  "accessed",
  "sync",
] as const;

export const AUDITABLE_TYPES = [
  "Administrator",
  "ApiCatalog",
  "Broadcast",
  "Content",
  "Documentation",
  "EgovEvent",
  "File",
  "Gallery",
  "GatewayCredential",
  "GatewayQuota",
  "Permission",
  "PermissionGroup",
  "Project",
  "Review",
  "Role",
  "User",
] as const;

// Who can act: the two authenticated audiences, by morph-map name. Used by the
// audit and auth-attempt actor filters (the WS documents `user_type` as
// "Administrator|User" on both).
export const ACTOR_TYPES = ["Administrator", "User"] as const;
