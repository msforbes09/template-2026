import "server-only";
import { env } from "@/lib/env";
import { logError } from "@/lib/log-error";

// Proves a backend token is real, and that it belongs to the identity the
// caller claims, BEFORE a local session is minted from it.
//
// This exists because writeAdminSession/writeClientSession are exported Server
// Actions imported by the public login, registration and password-reset forms:
// their action IDs ship in publicly served JavaScript, and Next's only gate on
// a direct POST is an Origin/Host comparison any HTTP client satisfies. They
// took an `accessToken` on trust and stored it verbatim, so anyone could mint
// a session for any identity — and lib/auth/dal.ts, the single frontend authN
// chokepoint, only checks that a row exists and has not expired.
//
// The frontend cannot verify a token by inspecting it (the backend signs it and
// owns the keys), so it asks the issuer: call the audience's own /profile with
// the token as Bearer. A 200 proves the backend accepts it; the returned
// identity proves whose it is. That closes both halves — an invented token and
// a real token replayed under someone else's name.
//
// NOT apiFetch: that reads the token off an existing session, and the whole
// point here is that there is not one yet.

const AUDIENCE_BASE_PATH = {
  admin: "/administrator",
  client: "/user",
} as const;

export type VerifiedIdentity = {
  // Every identity the backend recognises for this account, lowercased. The
  // citizen audience keys its local user row on "the mobile number or email
  // entered in the wizard's first step", so either may legitimately be the
  // claimed username.
  identifiers: string[];
};

type ProfileShape = {
  email?: string | null;
  mobile_number?: string | null;
};

// Returns the verified identity, or null when the token is not accepted, the
// backend is unreachable, or the response is not the shape a profile takes.
// Null always means "do not mint a session" — never "carry on optimistically".
export async function verifyAccessToken(
  audience: "admin" | "client",
  accessToken: string,
): Promise<VerifiedIdentity | null> {
  if (!accessToken || accessToken.length < 8) return null;

  try {
    const res = await fetch(`${env.API_URL}${AUDIENCE_BASE_PATH[audience]}/profile`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      // A stale cached 200 would defeat the check entirely.
      cache: "no-store",
    });

    // A 401 here is the expected answer for a forged token, not an incident —
    // logging it as an error would make a routine rejection look like a fault.
    if (!res.ok) return null;

    const body: unknown = await res.json();
    const data = (body as { data?: ProfileShape } | null)?.data;
    if (!data || typeof data !== "object") return null;

    const identifiers = [data.email, data.mobile_number]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .map((value) => value.trim().toLowerCase());

    // A profile with no identifier at all cannot be matched against a claim,
    // so it cannot be verified.
    if (identifiers.length === 0) return null;

    return { identifiers };
  } catch (err) {
    // Network/parse failure. Deny — an unreachable backend must not become a
    // way to mint an unverified session.
    await logError(err, { where: `verifyAccessToken ${audience}`, audience });
    return null;
  }
}

// Whether the claimed username is one the backend actually recognises for this
// token. Compared case-insensitively: an email is case-insensitive in practice
// and the login form passes through whatever was typed.
export function identityMatches(identity: VerifiedIdentity, claimed: string): boolean {
  return identity.identifiers.includes(claimed.trim().toLowerCase());
}
