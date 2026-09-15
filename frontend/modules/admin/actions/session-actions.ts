"use server";

import { cookies } from "next/headers";
import { auth } from "@/lib/auth/better-auth";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { verifyAccessToken, identityMatches } from "@/lib/auth/verify-access-token";
import { clearLocalAdminSession } from "@/modules/admin/lib/clear-local-admin-session";
import type { WriteSessionResult } from "@/lib/auth/write-session-result";

function normalizeSameSite(value: string | undefined) {
  return value?.toLowerCase() as "strict" | "lax" | "none" | undefined;
}

// Called once the client has already verified credentials (+ 2FA) directly
// against the Laravel backend — this only writes the local Better Auth
// session for the already-authenticated admin, it never re-checks anything.
export async function writeAdminSession(input: {
  email: string;
  accessToken: string;
}): Promise<WriteSessionResult> {
  // Verified BEFORE anything is created. This action is reachable by a
  // direct POST from outside the login form, so the token it is handed is
  // an untrusted claim until the backend that issued it says otherwise.
  const identity = await verifyAccessToken("admin", input.accessToken);
  if (!identity || !identityMatches(identity, input.email)) {
    return { ok: false, message: "We could not verify that sign-in. Please try again." };
  }

  const ctx = await auth.$context;

  const existing = await ctx.internalAdapter.findUserByEmail(input.email);
  const userId = existing
    ? existing.user.id
    : (
        await ctx.internalAdapter.createUser({
          email: input.email,
          name: input.email,
          emailVerified: true,
        })
      ).id;

  // The audience is stamped on the row so the DAL can assert it. Without
  // it the two Better Auth instances share one session shape, and a row
  // minted for one audience satisfied the other's guard — which is what
  // made a citizen token usable as an admin Bearer.
  const session = await ctx.internalAdapter.createSession(userId, false, {
    accessToken: input.accessToken,
    audience: "admin",
  });

  const sessionCookie = ctx.authCookies.sessionToken;
  (await cookies()).set(sessionCookie.name, session.token, {
    ...sessionCookie.attributes,
    sameSite: normalizeSameSite(sessionCookie.attributes.sameSite),
  });

  return { ok: true };
}

export async function clearAdminSession() {
  // Revoke the backend token first — apiFetch needs the local session (about
  // to be deleted below) to find it. Best-effort: an already-expired or
  // unreachable backend must not block clearing the local session. apiFetch
  // already logs non-2xx responses; only an unexpected (non-API) failure
  // needs logging here.
  try {
    await apiFetch("/logout", { method: "POST" }, "admin");
  } catch (err) {
    if (!isApiError(err)) {
      await logError(err, { where: "clearAdminSession -> POST /logout", audience: "admin" });
    }
  }

  await clearLocalAdminSession();
}
