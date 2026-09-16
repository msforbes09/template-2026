import "server-only";
import { headers } from "next/headers";
import { getAdminSession, getClientSession } from "@/lib/auth/dal";
import { clientIpFromHeaders } from "@/lib/client-ip";
import { buildApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { env } from "@/lib/env";

// Each audience's API is rooted at a different base path under env.API_URL
// (e.g. the Administrators API's OpenAPI `servers` entry is
// "{API_URL}/administrator", the User API's is "{API_URL}/user") — not just
// a different Bearer token.
const AUDIENCE_BASE_PATH: Record<"admin" | "client", string> = {
  admin: "/administrator",
  client: "/user",
};

// Server-only fetch against the backend. Pass audience: "admin"/"client" to
// attach that session's backend token (held on the Better Auth session as a
// custom `accessToken` field, see lib/auth/better-auth.ts and
// lib/auth/client-better-auth.ts) as a Bearer header and root the path under
// that audience's base path; omit it for unauthenticated calls. For the auth
// exchange itself, see modules/admin/lib/admin-auth-client.ts (admin) and
// modules/client-auth (the user login form) — those endpoints are
// hit directly from the browser and don't go through this server-only client.
//
// Authenticated calls also forward the browser's IP (X-Forwarded-For) so the
// WS attributes the request to the human, not to this server — it walks that
// header back through its trusted proxies, of which this server's egress IP is
// one (TRUSTED_PROXIES on the WS). Deliberately NOT done for unauthenticated
// calls: reading headers() opts the segment into dynamic rendering, which
// would break PPR for the public/SEO reads that share this client; the
// authenticated paths already read cookies() and are dynamic regardless.
//
// basePathOverride roots the path elsewhere while still using the given
// audience's token — e.g. the Common API's Files endpoints live under
// "/common" (OpenAPI servers: "{API_URL}/common"), not "/administrator", even
// when called with an admin session's Bearer token.
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  audience?: "admin" | "client",
  basePathOverride?: string,
): Promise<T> {
  let token: string | undefined;
  if (audience === "admin") {
    const session = await getAdminSession();
    token = (session?.session as { accessToken?: string } | undefined)?.accessToken;
  } else if (audience === "client") {
    const session = await getClientSession();
    token = (session?.session as { accessToken?: string } | undefined)?.accessToken;
  }
  
  const forwardedFor = audience ? await forwardedClientIp() : null;

  const basePath = basePathOverride ?? (audience ? AUDIENCE_BASE_PATH[audience] : "");
  // A FormData body (file uploads) needs its own auto-generated multipart
  // boundary in Content-Type — setting "application/json" here would break it.
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;

  const res = await fetch(`${env.API_URL}${basePath}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
      ...init?.headers,
    },
  });
  
  if (!res.ok) {
    const apiError = await buildApiError(res);
    await logError(apiError, {
      where: `apiFetch ${init?.method ?? "GET"} ${path}`,
      audience,
      status: apiError.status,
    });
    throw apiError;
  }
  return res.json();
}

// The incoming request's client IP, or null when there is no request to read
// (headers() throws outside a request scope — e.g. a call made from a
// background job or during build) or no usable header is present.
async function forwardedClientIp(): Promise<string | null> {
  try {
    const incoming = await headers();
    return clientIpFromHeaders((name) => incoming.get(name));
  } catch {
    return null;
  }
}
