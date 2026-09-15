// The audit-log filter vocab, mirrored by hand from the backend — there is no
// endpoint that lists either set.
//
// Events: `config/audit.php` → `events` (owen-it/laravel-auditing), plus
// `accessed` (app/Http/Middleware/LogPiiAccess.php — PII reads) and `sync`
// (auditSync() on Administrator roles / Role permissions).
// Subject types: every model that uses the Auditable trait, by its morph-map
// short name (project/app/Providers/AppServiceProvider.php). Add here when the
// backend audits a new model — audit-options.test.ts pins the set, so it fails
// rather than drifting silently.

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
  "Broadcast",
  "Content",
  "Documentation",
  "File",
  "Gallery",
  "Permission",
  "PermissionGroup",
  "Role",
  "User",
] as const;

// Who can act: the two authenticated audiences, by morph-map name. Used by the
// audit and auth-attempt actor filters (the backend documents `user_type` as
// "Administrator|User" on both).
export const ACTOR_TYPES = ["Administrator", "User"] as const;
