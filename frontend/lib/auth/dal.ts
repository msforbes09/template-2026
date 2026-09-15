import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/better-auth";
import { clientAuth } from "@/lib/auth/client-better-auth";

const ADMIN_LOGIN_PATH = "/admin/login";
// Email/password is the only citizen sign-in method — eGovPH SSO was removed.
const CLIENT_LOGIN_PATH = "/login";

// Asserts the row was minted for THIS audience.
//
// Both Better Auth instances store the same session shape, and the guards below
// only ever checked "a row exists and has not expired". A session created for
// one audience therefore satisfied the other's guard, which is what let a
// citizen token be presented as an admin Bearer by lib/api-client.ts. The
// writers stamp `audience`; this is the half that reads it.
//
// A row without the field is REJECTED rather than grandfathered: the session
// store is in-memory and does not survive a restart, so there is no population
// of legitimate old rows to protect — only forged ones would lack it.
function isAudience(session: unknown, audience: "admin" | "client"): boolean {
  const value = (session as { session?: { audience?: unknown } } | null)?.session?.audience;
  return value === audience;
}

// Reads the cookie via next/headers cookies() + internalAdapter.findSession
// (genuine Better Auth primitives) rather than the higher-level
// auth.api.getSession() wrapper, which returned null for a verifiably valid
// session in testing against this installed version — see the singleton
// note in better-auth.ts for the other half of what made this reliable.
export const getAdminSession = cache(async () => {
  const ctx = await auth.$context;
  const cookieName = ctx.authCookies.sessionToken.name;
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;

  const result = await ctx.internalAdapter.findSession(token);
  if (!result || result.session.expiresAt < new Date()) return null;
  if (!isAudience(result, "admin")) return null;

  return result;
});

// Guard for protected admin server actions / dynamic Server Components.
// Call before any apiFetch("...", ..., "admin").
export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) redirect(ADMIN_LOGIN_PATH);
  return session;
}

// Same pattern as getAdminSession, for the site/user ("client") audience.
export const getClientSession = cache(async () => {
  const ctx = await clientAuth.$context;
  const cookieName = ctx.authCookies.sessionToken.name;
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;

  const result = await ctx.internalAdapter.findSession(token);
  if (!result || result.session.expiresAt < new Date()) return null;
  if (!isAudience(result, "client")) return null;

  return result;
});

// Guard for protected client server actions / dynamic Server Components.
// Call before any apiFetch("...", ..., "client").
export async function requireClientSession() {
  const session = await getClientSession();
  if (!session) redirect(CLIENT_LOGIN_PATH);
  return session;
}
