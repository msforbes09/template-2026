# Remove mobile-number authentication — FE handoff

**PR:** `feature/remove-mobile-auth` → `develop`
**Breaking changes:** yes — the `sms` channel is gone from every user auth
endpoint, and the add-contact endpoints no longer exist.

## Endpoints

### Auth flows are email-only

`POST /api/v1/user/register`, `verify-registration`, `authenticate`,
`two-factor-authenticate`, `forgot-password`, `reset-password`:

- `channel` is no longer accepted. Sending it is harmless (ignored, not
  validated), but drop it.
- `mobile_number` is no longer accepted on these endpoints. It is ignored.
- `email` is now **required** everywhere it was previously conditional on the
  channel. A missing email is a `422` on `email`.

Response shapes are unchanged. The 428 `two_factor_required` envelope still
carries `auth_token`, `resend_token`, `retry_after`.

### Removed

- `POST /api/v1/user/profile/add-contact` → now `404`
- `POST /api/v1/user/profile/verify-contact` → now `404`

### Changed

`PUT /api/v1/user/profile` now accepts an optional `mobile_number`
(`nullable|string|max:20`, trimmed; empty string becomes `null`). It is a
plain contact field with no verification. `GET /profile` keeps returning it as
`data.mobile_number` (string or `null`).

`GET /api/v1/administrator/users/{uuid}` no longer returns
`authentication_channel`. `mobile_number` is still returned (masked on the
list, full on show).

## UI consequences

- Remove the Email / Mobile number toggle from register, login and
  forgot-password. Every account has an email.
- Remove the add-contact dialog and the "add a backup contact" dashboard
  prompt; there is no missing channel to add any more.
- Add a "Mobile number" input to the profile form.
- Admin user view: drop the authentication-channel badge.

## Notes

`mobile_number_verified_at` and `authentication_channel` stay as unused
columns on `users` by decision; nothing writes to them.
