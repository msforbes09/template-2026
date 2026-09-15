// The user account model, in one place.
//
// An account has one lifecycle axis, `status`: it is created as a draft and
// becomes `completed` once the profile is marked complete. Nothing else about
// what it may do is inferred from the status.

export type AccountStatus =
  // Registered, profile incomplete. Edits are free.
  | "draft"
  // Profile completed: both cooldown clocks started.
  | "completed";

const STATUSES: AccountStatus[] = ["draft", "completed"];

// Narrows the API's loose string. An unrecognised value returns null rather
// than throwing, so a backend that adds a status doesn't take the dashboard
// down — callers treat null as "nothing special applies".
export function accountStatus(status: string | null | undefined): AccountStatus | null {
  return STATUSES.includes(status as AccountStatus) ? (status as AccountStatus) : null;
}

export type Account = {
  status?: string | null;
  profile_completed_at?: string | null;
  details_editable_at?: string | null;
  photo_editable_at?: string | null;
};

// Completion is stamped rather than inferred, so reading the timestamp is the
// only correct test.
export function hasCompletedProfile(account: Account): boolean {
  return !!account.profile_completed_at;
}

// The profile can only be marked complete from draft; everything later has
// already been through it.
export function canCompleteProfile(account: Account): boolean {
  return accountStatus(account.status) === "draft";
}

// ── The edit cooldowns ────────────────────────────────────────────────────
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
