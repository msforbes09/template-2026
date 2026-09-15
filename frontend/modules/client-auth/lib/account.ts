import type { ClientAccountType } from "@/types/client-user";

// The citizen account model, in one place.
//
// An account has two INDEPENDENT axes: `type` (what it may do) and `status`
// (where it is in its lifecycle). They are genuinely orthogonal — a developer
// can be suspended, a basic account can be mid-application — so nothing here
// infers one from the other.

export type AccountStatus =
  // Registered, profile incomplete. Edits are free.
  | "draft"
  // Profile completed: basic features unlocked, both cooldown clocks started.
  | "completed"
  // Applied as a developer and sitting in the admin queue. Details locked.
  | "for_assessment"
  // Returned with remarks. Edits are free again, and it resubmits directly
  // without re-completing.
  | "for_resubmission"
  // Developer.
  | "approved"
  // Admin sanction: a read-only freeze.
  | "suspended"
  // Dormant SSO account. SSO is paused, so this is legacy data.
  | "pending";

const STATUSES: AccountStatus[] = [
  "draft",
  "completed",
  "for_assessment",
  "for_resubmission",
  "approved",
  "suspended",
  "pending",
];

// Narrows the API's loose string. An unrecognised value returns null rather
// than throwing, so a backend that adds a status doesn't take the dashboard
// down — callers treat null as "nothing special applies".
export function accountStatus(status: string | null | undefined): AccountStatus | null {
  return STATUSES.includes(status as AccountStatus) ? (status as AccountStatus) : null;
}

export type Account = {
  status?: string | null;
  type?: ClientAccountType;
  profile_completed_at?: string | null;
  details_editable_at?: string | null;
  photo_editable_at?: string | null;
};

export function isDeveloper(account: Account): boolean {
  return account.type === "developer";
}

export function isSuspended(account: Account): boolean {
  return accountStatus(account.status) === "suspended";
}

// Completion is what unlocks reviewing, and it is stamped rather than
// inferred: a returned account is past completion even though its status is
// `for_resubmission`, so reading the timestamp is the only correct test.
export function hasCompletedProfile(account: Account): boolean {
  return !!account.profile_completed_at;
}

// ── What the account may do ───────────────────────────────────────────────
//
// The frontend gates on these so a control that would be refused is never
// offered. The API remains the authority; these only decide what to render.

// Reviews and replies both require a completed profile, and suspension
// removes the ability entirely.
export function canReview(account: Account): boolean {
  return hasCompletedProfile(account) && !isSuspended(account);
}

// Creating projects and minting credentials are developer-only, and a
// suspended developer has already been demoted — but the status is checked
// too rather than trusting that ordering.
export function canCreateProjects(account: Account): boolean {
  return isDeveloper(account) && !isSuspended(account);
}

// A suspended account is frozen read-only: it may still authenticate and read
// its own data, but may not write anything, including its own profile.
// Reviewing an API catalog needs an APPROVED DEVELOPER account — a stricter
// bar than reviewing a project, which any authenticated citizen may do. The
// rule currently matches canCreateProjects, but it is written out separately
// rather than aliased: they answer different questions and the backend gates
// them on different endpoints, so a future divergence should not need one of
// them untangled from the other.
export function canReviewCatalogs(account: Account): boolean {
  return isDeveloper(account) && !isSuspended(account);
}

export function canEditProfile(account: Account): boolean {
  return !isSuspended(account);
}

// Only from `completed` or `for_resubmission` — a bare draft can no longer
// apply, which is the change that makes profile completion a real step.
export function canApplyAsDeveloper(account: Account): boolean {
  const status = accountStatus(account.status);
  return status === "completed" || status === "for_resubmission";
}

// The profile can only be marked complete from draft; everything later has
// already been through it.
export function canCompleteProfile(account: Account): boolean {
  return accountStatus(account.status) === "draft";
}

// ── The 30-day edit cooldowns ─────────────────────────────────────────────
//
// Details and photo run on separate clocks and the API owns both. It returns
// a timestamp when the field is locked and null when it is editable, so this
// never computes a date — it only reads one.

export type Cooldown = { locked: boolean; until: string | null };

export function detailsCooldown(account: Account): Cooldown {
  return { locked: !!account.details_editable_at, until: account.details_editable_at ?? null };
}

export function photoCooldown(account: Account): Cooldown {
  return { locked: !!account.photo_editable_at, until: account.photo_editable_at ?? null };
}
