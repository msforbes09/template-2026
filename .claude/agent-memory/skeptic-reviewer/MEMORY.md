# skeptic-reviewer memory

Recurring findings and false positives in this repository. Add an entry when the same class of issue shows up twice; remove it when the codebase enforces it structurally.

## Recurring findings

- 2026-09-16: a validation rule in a Form Request that queries the database by a user-supplied identifier runs BEFORE any OTP or secret check in the controller. Anything keyed on an address or uuid in `rules()` is pre-auth; look for oracles.
- 2026-09-16: a default callback written inline in a component's parameter list is a new function every render. If it sits in `useEffect`/`useCallback` deps the effect churns; tests that inject stable mocks hide it. Ask for a test that uses the production defaults.
- 2026-09-16: `wasRecentlyCreated` is sticky for the instance's lifetime, so a `saved` hook keyed on it fires again on any later save in the same request (seeders do create-then-update). `wasChanged()` is false after an insert; use `created` + `updated`.
- 2026-09-16: a "postponement" that only increments a counter postpones nothing; check that a waive moves a stored deadline and that the gate keys on the clock, not on the client's cooperation.
- 2026-09-16: `updated_at` is bumped by every login (`last_login_at`), so it is never a password age. Backfills should use the migration time or null.
- 2026-09-16: the command guard sees the whole Bash tool string, so a review command that quotes a blocked phrase gets blocked; write cases to a file and read them.

## Known false positives

- Boolean fields serialised as `1`/`0` and datetimes as `Y-m-d H:i:s` are the house convention, not a bug.
- `422` reserved for validation and `400` for domain errors is deliberate; do not flag a domain error for "should be 409/403".
- Uniqueness and referential integrity are enforced in Form Requests and application code by rule, never by database constraints.
