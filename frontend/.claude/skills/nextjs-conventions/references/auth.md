# Auth — Better Auth Stateless, Multi-Audience

Read for per-audience Better Auth instances, the namespaced cookies, the DAL guard (getSession/requireSession), and proxy.ts.

Better Auth runs in **stateless mode**: no database, no adapter. The backend (Laravel) owns all real auth logic — it issues the JWT and decides session policy. Next.js is frontend-only: its job is just to store the JWT the backend issued in a cookie and forward it as a Bearer header. The session cookie holds only `{ id, email, name, accessToken }`, where `accessToken` is the backend JWT.

**Multi-audience rule:** this is one project serving multiple audiences (e.g. `client`, `admin`, and others). Each audience gets its **own Better Auth instance with its own cookie name and scope**, so an admin login never overwrites a client session and vice-versa. Never share one cookie across audiences.

Per-audience config — the cookie name (and optionally `path`) is what separates them:

```ts
// lib/auth/factory.ts — one factory, configured per audience
import { betterAuth } from "better-auth";
import { env } from "@/lib/env";

type Audience = "client" | "admin"; // extend as needed

export function createAuth(audience: Audience) {
  return betterAuth({
    // stateless: no database / no adapter
    secret: env.BETTER_AUTH_SECRET,
    advanced: {
      cookiePrefix: `app-${audience}`,        // → cookie: app-admin.session_token
      // Optional hard isolation by path so the browser only sends the
      // relevant cookie to the matching route group:
      // defaultCookieAttributes: { path: audience === "admin" ? "/admin" : "/" },
    },
    // session payload limited to what the backend returned
  });
}
```

```ts
// lib/auth/index.ts — concrete instances
import { createAuth } from "./factory";

export const clientAuth = createAuth("client"); // cookie: app-client.session_token
export const adminAuth = createAuth("admin");   // cookie: app-admin.session_token

// Resolve the right instance from the current route/segment.
export function authFor(audience: "client" | "admin") {
  return audience === "admin" ? adminAuth : clientAuth;
}
```

### Guard rule (protected server-side data access)

**Every server action and every dynamic Server Component that hits a protected endpoint must guard first** via `requireSession(audience)`, before any `apiFetch`. The guard returns the session (with the token) or redirects to the audience login — so a request never reaches the backend without a token, and an expired session fails fast at the page/action instead of as a confusing 401 mid-render.

This is the Data Access Layer (DAL) pattern Next.js recommends: centralize the check in one module, and wrap the session read in React's `cache()` so multiple components in a single render share one verification instead of re-reading the cookie each time.

Only **explicitly public** reads skip the guard — e.g. the SEO product/listing pages in the `(client)` group that are meant to be crawlable. Mark those calls clearly as public; everything else guards.

> **PPR note:** `getSession`/`requireSession` call `headers()` internally, which makes them a dynamic API by transitivity (`data-fetching.md`'s dynamic-API table). Calling `requireSession(audience)` directly inside a `page.tsx`'s own function body is exactly as PPR-breaking as calling `headers()` there — it must only be called from inside the Suspense-wrapped dynamic component (as in every `UsersList`-style example in this skill), never at the page root. Server actions and route handlers are exempt from this — they aren't part of the prerendered shell, so guarding at the top of an action or route handler is normal and correct.

```ts
// lib/auth/dal.ts — server-only Data Access Layer
import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authFor } from "@/lib/auth";

const LOGIN: Record<"client" | "admin", string> = {
  client: "/login",
  admin: "/admin/login",
};

// Cached per-request: many components/actions in one render → one verification.
export const getSession = cache(async (audience: "client" | "admin") => {
  return authFor(audience).api.getSession({ headers: await headers() });
});

// Guard: returns the session or redirects. Call at the top of protected
// actions and dynamic Server Components, before any apiFetch.
export async function requireSession(audience: "client" | "admin") {
  const session = await getSession(audience);
  if (!session?.user.accessToken) redirect(LOGIN[audience]);
  // Token presence is NOT enough — assert the session was minted for THIS
  // audience. See "Audience is asserted, not implied" below.
  if (session.audience !== audience) redirect(LOGIN[audience]);
  return session; // { audience, user: { id, email, name, accessToken } }
}
```

> `getSession` is the cached read (use it when you just need the session, e.g. to branch UI). `requireSession` is the guard that redirects. Because `cache()` is per-request, the dedup applies within one render pass — exactly when a page has several protected components.

## Writing a session (the other half of the guard)

The guard above is the **read** side. The write side is where the token first
enters the app, and it is the higher-value target: a flaw here mints authority
rather than merely failing to check it.

The action that writes a session is imported by public login, registration and
password-reset forms, so its action ID ships in the client bundle and an anonymous
POST reaches it (`security.md` rule 1). It cannot take its arguments on trust.

**Verify with the issuer before writing anything.** The frontend did not sign the
token and holds no key, so it cannot validate one by inspection — it has to ask
the backend that issued it:

```ts
export async function writeSession(
  audience: "client" | "admin",
  input: { username: string; accessToken: string },
): Promise<WriteSessionResult> {
  // 1. The backend accepts this token…
  const identity = await verifyAccessToken(audience, input.accessToken);
  // 2. …and it belongs to the identity being claimed.
  if (!identity || !identityMatches(identity, input.username)) {
    return { ok: false, message: "We could not verify that sign-in. Please try again." };
  }

  // 3. Stamp the audience so the guard can assert it.
  const session = await createSession(userId, { accessToken: input.accessToken, audience });
  (await cookies()).set(cookieName, session.token, cookieAttributes);
  return { ok: true };
}
```

Step 2 is not optional: a 200 proves the token is *real*, not that it belongs to
the name being claimed. Without it a valid citizen token can be replayed to mint a
session under someone else's identity — or under the other audience.

**Deny on every failure**, including an unreachable backend. An outage must not
become a way to mint an unverified session.

**Return a result, never `void` and never a throw.** These are awaited inside
client form handlers that have no try/catch: a throw becomes an unhandled
rejection, and a `void` return lets a failed verification fall straight through to
`router.push()` — signed out, but sitting on the dashboard.

```ts
export type WriteSessionResult = { ok: true } | { ok: false; message: string };
```

Every call site checks `ok` and surfaces the message as a root form error.

## Audience is asserted, not implied

The multi-audience rule above separates **cookie names**. That stops one audience
overwriting the other's session. It does **not** stop a session minted for one
audience satisfying the other's guard — the instances share a secret and a session
shape, so to `findSession()` the rows are indistinguishable.

That gap is a privilege escalation, not a tidiness issue: a citizen token carried
on an admin-audience session is then attached by `apiFetch` as the admin `Bearer`.

So: stamp `audience` when writing (above), and assert it when reading (in
`requireSession`, above). Reject a row that lacks the field rather than
grandfathering it — only a forged or stale row would be missing it.

## Authorization: fail closed

This file is about **authentication** — is there a valid token, and whose. What a
holder may *do* is a separate question, and the backend is always the real
boundary. But the frontend still decides what to render, and that decision must
fail closed:

```ts
export async function can(permission: string): Promise<boolean> {
  const profile = await getProfile();
  if (!profile || !Array.isArray(profile.permissions)) return false; // unresolved → deny
  return profile.permissions.includes(permission);
}
```

Returning `true` when the answer is unknown — on the reasoning that it shouldn't
hide features that work — inverts under exactly the conditions that matter: a
junk or forged token 401s, the profile resolves to `null`, and every permission
answers *yes*. See `security.md` rule 4 for the full counter-example.

Route groups make the audience explicit in the URL tree, so each segment knows which instance to use:

```
app/
├── (client)/…      // uses clientAuth  → app-client.session_token
└── (admin)/…       // uses adminAuth   → app-admin.session_token
```

**Auth checks happen inside dynamic Server Components or parallel-route slots — never at the page root** (awaiting the session at the root would break PPR). Use `proxy.ts` only for optimistic redirects based on cookie presence — and it must check the *audience-specific* cookie for the path it's guarding. `proxy.ts` is a UX optimization, **not** the security boundary; `requireSession` in the action/component is the real guard.

`lib/api-client.ts` reads the audience's session and forwards its JWT. Pass the audience in (defaulting per route group) so the right cookie is read:

```ts
// lib/api-client.ts — server-only centralized fetch
import "server-only";
import { authFor } from "@/lib/auth";
import { buildApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { env } from "@/lib/env";
import { headers } from "next/headers";

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  audience: "client" | "admin" = "client",
): Promise<T> {
  const session = await authFor(audience).api.getSession({ headers: await headers() });
  const res = await fetch(`${env.API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(session?.user.accessToken
        ? { Authorization: `Bearer ${session.user.accessToken}` }
        : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const apiError = await buildApiError(res);
    await logError(apiError, { where: `apiFetch ${init?.method ?? "GET"} ${path}`, audience, status: apiError.status });
    throw apiError; // see api-contract.md + the logging section in `error-handling.md`
  }
  return res.json();
}
```

```tsx
// Dynamic Server Component — guard first, then fetch (preserves PPR)
import { requireSession } from "@/lib/auth/dal";
import { apiFetch } from "@/lib/api-client";

export async function AdminSecureSection() {
  const session = await requireSession("admin"); // redirects if not authed
  const { data } = await apiFetch<{ data: Stats }>("/admin/stats", {
    next: { tags: ["admin:stats"] },
  }, "admin");
  return <AdminDashboard userId={session.user.id} stats={data} />;
}
```

```ts
// proxy.ts — optimistic redirect, checks the audience-specific cookie
import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!req.cookies.has("app-admin.session_token")) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }
  if (pathname.startsWith("/dashboard")) {
    if (!req.cookies.has("app-client.session_token")) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }
  return NextResponse.next();
}
```

> Because cookie names differ per audience, both sessions can coexist in one browser without collision; the backend remains the source of truth for whether each JWT is still valid. If you want stricter isolation (so the browser doesn't even send the admin cookie on client routes), set a per-audience cookie `path` matching the route group.

---
