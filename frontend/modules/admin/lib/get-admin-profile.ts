import "server-only";
import { cache } from "react";
import { apiFetch } from "@/lib/api-client";
import { getAdminSession } from "@/lib/auth/dal";
import type { Administrator } from "@/types/administrator";

// Returns null on any failure (no session, 401, network) rather than
// throwing — this backs a display-only header, not an access guard.
// requireAdminSession (lib/auth/dal.ts) is the actual security boundary.
// Checks for a session before fetching (cheap — getAdminSession is already
// cache()-memoized per request) so a visitor with no session at all doesn't
// get logged as an error — apiFetch logs every non-2xx response, including
// a routine, entirely expected 401.
export const getAdminProfile = cache(async (): Promise<Administrator | null> => {
  const session = await getAdminSession();
  if (!session) return null;
  try {
    const { data } = await apiFetch<{ data: Administrator }>("/profile", {}, "admin");
    return data;
  } catch {
    return null;
  }
});
