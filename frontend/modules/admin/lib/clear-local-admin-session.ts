import "server-only";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth/better-auth";

// Drops the local Better Auth session and its cookie, and nothing else.
//
// Deliberately does NOT call POST /logout, which is what separates it from
// clearAdminSession(). It exists for the one case where the backend token is
// ALREADY dead — a password change revokes every token for that administrator
// server-side — so revoking it again is both pointless and guaranteed to 401.
// apiFetch reports every non-2xx to Slack, so reusing clearAdminSession() there
// would ship an error report on every successful password change.
//
// Not in session-actions.ts because that file is "use server": exporting this
// from there would publish it as a callable HTTP endpoint, and it is an
// internal helper, not an action.
export async function clearLocalAdminSession() {
  const ctx = await auth.$context;
  const sessionCookie = ctx.authCookies.sessionToken;
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie.name)?.value;
  if (token) {
    await ctx.internalAdapter.deleteSession(token);
  }
  cookieStore.delete(sessionCookie.name);
}
