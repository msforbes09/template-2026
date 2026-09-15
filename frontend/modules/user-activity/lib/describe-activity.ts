import type { UserActivityEvent } from "@/types/user-activity";

// Named for what the events mean now, not for the flow they were built for:
// `user.activated` fires on an administrator approving a developer
// application, and `user.authenticated` on an ordinary 2FA sign-in.
const EVENT_LABEL: Record<UserActivityEvent["event"], string> = {
  ".user.authenticated": "Signed in",
  ".user.activated": "Application approved",
};

export function describeActivity(activity: UserActivityEvent) {
  const title = EVENT_LABEL[activity.event];
  return { title, toastMessage: `${title}: ${activity.payload.user}` };
}
