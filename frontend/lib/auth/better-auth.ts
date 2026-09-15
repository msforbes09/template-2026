import "server-only";
import { betterAuth } from "better-auth";
import { memoryAdapter, type MemoryDB } from "@better-auth/memory-adapter";
import { env } from "@/lib/env";

// The Laravel backend remains the real source of truth for credentials and
// 2FA (see modules/admin/lib/admin-auth-client.ts) — this instance's only
// job is to hold the resulting *local* session: an httpOnly cookie the
// server can read on subsequent requests, without re-verifying every time.
// The backend's own bearer token rides along as a custom session field
// (`accessToken`) so lib/api-client.ts can forward it to protected reads.
//
// Next.js compiles Route Handlers and Server Components into separate
// bundles, so a plain module-level object is NOT a reliable singleton across
// them (verified directly: a session written via a route.ts was invisible to
// a page.tsx importing the "same" module). Pin it on globalThis instead —
// the standard workaround for this class of problem, the same pattern used
// for Prisma Client singletons in Next.js.
declare global {
  var __adminAuthDb: MemoryDB | undefined;
}

const db: MemoryDB =
  globalThis.__adminAuthDb ?? { user: [], session: [], account: [], verification: [] };
globalThis.__adminAuthDb = db;

export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_SITE_URL,
  database: memoryAdapter(db),
  secret: env.BETTER_AUTH_SECRET,
  advanced: {
    cookiePrefix: "app-admin",
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
