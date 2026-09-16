"use server";

import { cookies } from "next/headers";
import { clientAuth } from "@/lib/auth/client-better-auth";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { verifyAccessToken, identityMatches } from "@/lib/auth/verify-access-token";
import type { WriteSessionResult } from "@/lib/auth/write-session-result";
import type { ActionResult } from "@/lib/action-result";
import { requireClientSession } from "@/lib/auth/dal";

function normalizeSameSite(value: string | undefined) {
  return value?.toLowerCase() as "strict" | "lax" | "none" | undefined;
}

// Called once the client holds the backend's bearer token — this only writes the local "client" Better Auth session, mirroring
// modules/admin/actions/session-actions.ts's writeAdminSession. `username` is
// the email entered in the wizard's first step, used as the session store's
// lookup key.
export async function writeClientSession(input: {
  username: string;
  accessToken: string;
}): Promise<WriteSessionResult> {
  // Verified BEFORE anything is created. This action is reachable by a
  // direct POST from outside the login form, so the token it is handed is
  // an untrusted claim until the backend that issued it says otherwise.
  const identity = await verifyAccessToken("client", input.accessToken);
  if (!identity || !identityMatches(identity, input.username)) {
    return { ok: false, message: "We could not verify that sign-in. Please try again." };
  }

  const ctx = await clientAuth.$context;

  const existing = await ctx.internalAdapter.findUserByEmail(input.username);
  const userId = existing
    ? existing.user.id
    : (
        await ctx.internalAdapter.createUser({
          email: input.username,
          name: input.username,
          emailVerified: true,
        })
      ).id;

  // The audience is stamped on the row so the DAL can assert it. Without
  // it the two Better Auth instances share one session shape, and a row
  // minted for one audience satisfied the other's guard — which is what
  // made a user token usable as an admin Bearer.
  const session = await ctx.internalAdapter.createSession(userId, false, {
    accessToken: input.accessToken,
    audience: "client",
  });

  const sessionCookie = ctx.authCookies.sessionToken;
  (await cookies()).set(sessionCookie.name, session.token, {
    ...sessionCookie.attributes,
    sameSite: normalizeSameSite(sessionCookie.attributes.sameSite),
  });

  return { ok: true };
}

// Drops the LOCAL session only — the Better Auth row and its cookie — without
// telling the backend anything.
//
// Separate from clearClientSession because there are two ways a session ends
// and only one of them should call /logout. Signing out has a live token worth
// revoking. Deleting the account does not: the backend has already revoked
// every token, so a /logout would just 401 on the way out.
export async function clearClientSessionCookie() {
  const ctx = await clientAuth.$context;
  const sessionCookie = ctx.authCookies.sessionToken;
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie.name)?.value;
  if (token) {
    await ctx.internalAdapter.deleteSession(token);
  }
  cookieStore.delete(sessionCookie.name);
}

export async function clearClientSession() {
  try {
    await apiFetch("/logout", { method: "POST" }, "client");
  } catch (err) {
    if (!isApiError(err)) {
      await logError(err, { where: "clearClientSession -> POST /user/logout", audience: "client" });
    }
  }

  await clearClientSessionCookie();
}

// One cheap authenticated request so the backend slides the session's
// inactivity window (`refresh.token` runs on every authenticated route), and
// the window length back so the client restarts its own countdown from it.
// Used by IdleSessionWatcher's "Stay signed in"; a failure means the token is
// already gone and the caller signs out.
export async function keepClientSessionAlive(): Promise<ActionResult<{ session_inactivity_minutes?: number }>> {
  await requireClientSession();

  try {
    const { data } = await apiFetch<{ data: { session_inactivity_minutes?: number } }>(
      "/profile",
      {},
      "client",
    );
    return { ok: true, data: { session_inactivity_minutes: data.session_inactivity_minutes } };
  } catch (err) {
    if (isApiError(err)) {
      return { ok: false, status: err.status, message: err.message, errors: err.errors };
    }
    await logError(err, { where: "keepClientSessionAlive action", audience: "client" });
    return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
  }
}
