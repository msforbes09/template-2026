# skeptic-reviewer memory

Recurring findings and false positives in this repository. Add an entry when the same class of issue shows up twice; remove it when the codebase enforces it structurally.

## Recurring findings

- (none yet)

## Known false positives

- Boolean fields serialised as `1`/`0` and datetimes as `Y-m-d H:i:s` are the house convention, not a bug.
- `422` reserved for validation and `400` for domain errors is deliberate; do not flag a domain error for "should be 409/403".
- Uniqueness and referential integrity are enforced in Form Requests and application code by rule, never by database constraints.
