# User profile completion — FE handoff

**PR:** #1 (merged into `develop` on 2026-09-15)
**Breaking changes:** none

## Endpoints

### `POST /api/v1/user/profile/complete`

Auth: `users` guard bearer token. Throttle: 5/min per account.

Moves a `draft` account to `completed` once every required profile field is
filled, and starts the profile edit cooldown.

Request: no body.

Response `200`:

```json
{
  "data": {
    "uuid": "01931f2e-7b3a-73c4-9a1e-2f6b0c8d4e10",
    "status": "completed",
    "profile_completed_at": "2026-09-15 10:12:45",
    "details_editable_at": "2026-10-15",
    "photo_editable_at": "2026-10-15"
  }
}
```

Errors:

| Status | `error` | When |
|---|---|---|
| 400 | `invalid_status` | Account is not `draft` |
| 400 | `profile_incomplete` | Required fields missing; `meta.missing` lists them |
| 403 | `profile_not_editable` | Non-website account |
| 401 | `unauthenticated` | Missing or expired token |

## UI consequences

- Show a "Complete profile" call to action while `status` is `draft`.
- After completion, disable the details form until `details_editable_at`
  (null means editable now) and the photo control until `photo_editable_at`.
- Render `meta.missing` as inline field errors on `profile_incomplete`.

## Notes

No feature flag. No migration.
