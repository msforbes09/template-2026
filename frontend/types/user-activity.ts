// Live user activity, delivered over the private-administrators Reverb
// channel and rendered on the admin dashboard.
//
// These types outlived eGovPH SSO. The channel was built for the activation
// kiosk, but its two events are still dispatched from paths that are very
// much alive (see the backend's UserBroadcast):
//
//   user.authenticated — a user completing 2FA sign-in
//   user.activated     — an administrator approving a developer application
//                        (Concerns/AssessedByAdmin::approveAssessment)
//
// Only the SSO dispatchers died with the flow.

// A `user.authenticated` or `user.activated` event. Both share this payload.
export type UserActivityEvent = {
  id: string;
  event: ".user.authenticated" | ".user.activated";
  // Pre-masked by the backend — either an email ("q5****@yahoo.com") or a
  // mobile number ("+63****9043"), matching the channel/mobile_number
  // identifier system across the User API's auth endpoints.
  payload: { user: string; photo_url: string };
  receivedAt: string; // ISO, client-captured — Reverb events carry no envelope timestamp
};

// A `user.activities` event on the same channel — rolling totals rather than
// a discrete per-user notification. `api_access` is incremented by the
// backend's CountApiAccess middleware on every API request, so it moves far
// more than the other two.
export type UserActivityTotals = {
  authenticated: { total: number; per_second: number };
  activated: { total: number; per_second: number };
  api_access: { total: number; per_second: number };
  at: string;
};
