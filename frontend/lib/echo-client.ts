import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { env } from "@/lib/env";

// laravel-echo's own Window.Pusher ambient type (typings/window.d.ts) isn't
// reachable from this repo's tsconfig (its "types" entry is dist/echo.d.ts,
// which doesn't reference it) — declare it ourselves so `window.Pusher =
// Pusher` below type-checks.
declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

export type EchoAudience = "admin" | "client";

// One socket per audience. They can't share: channel authorization is bound
// to the audience's own backend endpoint and guard (an admin token is
// rejected on `user.{uuid}` and vice versa), and the endpoint is fixed per
// Echo instance via the authorizer below. In practice only one is ever
// created per page — an admin console and a user dashboard are different
// routes — but keying the singleton makes that a property of the code rather
// than an assumption about routing.
const echoInstances: Partial<Record<EchoAudience, Echo<"reverb">>> = {};

const AUTH_ENDPOINTS: Record<EchoAudience, string> = {
  admin: "/api/broadcasting/admin/auth",
  client: "/api/broadcasting/client/auth",
};

// Purely browser-side singletons. Unlike lib/auth/better-auth.ts's
// globalThis-pinned singletons (needed because Next.js compiles Route
// Handlers and Server Components into separate module bundles), plain
// module-scope state is enough here — this module is never imported by
// server code, so there's only ever one JS module graph to be a singleton
// across.
//
// Must only be called from inside a useEffect in a "use client" leaf, never
// at module top-level or during render — window/Pusher don't exist during
// SSR, and creating a socket during render would fire on every re-render.
export function getEcho(audience: EchoAudience): Echo<"reverb"> {
  if (typeof window === "undefined") {
    throw new Error("getEcho() must only be called client-side (e.g. inside a useEffect).");
  }
  const existing = echoInstances[audience];
  if (existing) return existing;

  // Laravel Reverb bootstrapping requirement — pusher-js's runtime resolves
  // window.Pusher as one of its fallbacks; also passed directly via the
  // `Pusher` option below for the primary resolution path.
  window.Pusher = Pusher;

  const instance = new Echo<"reverb">({
    broadcaster: "reverb",
    key: env.NEXT_PUBLIC_REVERB_APP_KEY,
    wsHost: env.NEXT_PUBLIC_REVERB_HOST,
    wsPort: env.NEXT_PUBLIC_REVERB_PORT,
    wssPort: env.NEXT_PUBLIC_REVERB_PORT,
    forceTLS: env.NEXT_PUBLIC_REVERB_FORCE_TLS,
    enabledTransports: ["ws", "wss"],
    Pusher,
    // Custom authorizer: hits OUR OWN internal route handler instead of
    // pusher-js's default authEndpoint POST behavior. The audience's Bearer
    // token lives server-side only (session.session.accessToken, an
    // httpOnly-cookie-backed Better Auth session — see lib/auth/dal.ts /
    // lib/api-client.ts) and is never exposed to client JS anywhere in this
    // codebase; the browser cannot attach it itself, so this hop re-derives
    // it server-side from the cookie and forwards to Laravel's real
    // /administrator|/user/broadcasting/auth.
    authorizer: (channel) => ({
      authorize: (socketId, callback) => {
        fetch(AUTH_ENDPOINTS[audience], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
        })
          .then(async (res) => {
            if (!res.ok) throw new Error(`Channel auth failed (${res.status})`);
            return res.json();
          })
          .then((data) => callback(null, data))
          .catch((err: unknown) =>
            callback(err instanceof Error ? err : new Error(String(err)), null),
          );
      },
    }),
  });

  echoInstances[audience] = instance;
  return instance;
}
