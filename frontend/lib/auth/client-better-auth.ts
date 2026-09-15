import "server-only";
import { betterAuth } from "better-auth";
import { memoryAdapter, type MemoryDB } from "@better-auth/memory-adapter";
import { env } from "@/lib/env";

// Mirrors lib/auth/better-auth.ts, one instance per audience — see that
// file's comments for why the session store is real (holds the backend's
// bearer token as a custom field) and why it's pinned on globalThis (Route
// Handlers and Server Components compile to separate bundles, so a plain
// module-level object isn't a reliable singleton across them). The eGov SSO
// citizen login form (modules/client-auth) is the credential source here
// instead of a Laravel email/password form.
declare global {
  var __clientAuthDb: MemoryDB | undefined;
}

const db: MemoryDB =
  globalThis.__clientAuthDb ?? { user: [], session: [], account: [], verification: [] };
globalThis.__clientAuthDb = db;

export const clientAuth = betterAuth({
  baseURL: env.NEXT_PUBLIC_SITE_URL,
  database: memoryAdapter(db),
  secret: env.BETTER_AUTH_SECRET,
  advanced: {
    cookiePrefix: "app-client",
  },
  session: {
    expiresIn: 60 * 60 * 8, // 8 hours
    additionalFields: {
      accessToken: { type: "string" },
      // Which audience minted this row. Asserted by the DAL guards: the two
      // instances share one session shape, so without it a row created for one
      // audience satisfied the other's guard.
      audience: { type: "string" },
    },
  },
});
