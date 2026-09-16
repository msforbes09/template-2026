// The actual session cookie name is owned by Better Auth itself now (derived
// from the `cookiePrefix: "app-admin"` config in lib/auth/better-auth.ts) —
// read it via `ctx.authCookies.sessionToken`, don't hardcode it here.
//
// This one is unrelated to the session: it's a Laravel-specific trusted
// -device marker (skips 2FA within a trust window), written client-side by
// modules/admin/lib/session-cookie.ts.
export const DEVICE_TOKEN_COOKIE = "app-admin.device_token";

// Same pattern as DEVICE_TOKEN_COOKIE, for the "client" audience's trusted
// -device marker — written client-side by
// modules/client-auth/lib/session-cookie.ts.
export const CLIENT_DEVICE_TOKEN_COOKIE = "app-client.device_token";
