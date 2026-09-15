import "server-only";
import { cache } from "react";
import { apiFetch } from "@/lib/api-client";
import { getClientSession } from "@/lib/auth/dal";
import type { ClientUserProfile } from "@/types/client-user";

// Returns null on any failure (no session, 401, network) rather than
// throwing — this backs a display-only header, not an access guard.
// requireClientSession (lib/auth/dal.ts) is the actual security boundary.
// Checks for a session before fetching (cheap — getClientSession is already
// cache()-memoized per request): this renders on every public page for
// every visitor, nearly all of them signed out, so skipping straight to
// null there avoids apiFetch logging a routine 401 as an error on every
// single anonymous page view.
export const getClientProfile = cache(async (): Promise<ClientUserProfile | null> => {
  const session = await getClientSession();
  if (!session) return null;
  try {
    const { data } = await apiFetch<{ data: ClientUserProfile }>("/profile", {}, "client");
    return data;
  } catch {
    return null;
  }
});
