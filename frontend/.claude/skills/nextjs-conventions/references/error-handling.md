# API Error Handling & Logging

Read for mapping Laravel error responses into RHF, and the dev/prod error-logging rule (generic message in prod, real error to Slack).

All API calls go through `apiFetch` (server-side). Since mutations are **server actions** (`data-fetching.md`), the action catches the `ApiError` and returns a structured result; the client maps it into React Hook Form. Map error responses by status:

- **422** — validation. Map each field in the `errors` object to React Hook Form via `setError` per field; show top-level `message` as a root alert.
- **401** — session expired. Redirect to login.
- **Other non-2xx** — show `message` as a destructive alert.

```ts
// lib/action-result.ts — shared discriminated result for every server action
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; errors: Record<string, string[]> };
```

```tsx
// modules/users/actions/user-actions.ts — action returns a typed result
"use server";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireSession } from "@/lib/auth/dal";
import type { ActionResult } from "@/lib/action-result";
import { revalidateTag } from "next/cache";

export async function createUser(values: UserInput): Promise<ActionResult<User>> {
  await requireSession("admin"); // guard before touching the backend
  try {
    const { data } = await apiFetch<{ data: User }>("/users", {
      method: "POST",
      body: JSON.stringify(values),
    }, "admin");
    revalidateTag("users");
    return { ok: true, data };
  } catch (err) {
    if (isApiError(err)) { // already logged inside apiFetch
      const safe = err.status >= 500 && env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message;
      return { ok: false, status: err.status, message: safe, errors: err.errors };
    }
    await logError(err, { where: "createUser action", audience: "admin" }); // unexpected only
    return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
  }
}
```

```tsx
// client side — submit calls the action, maps the result into RHF
async function onSubmit(values: Values) {
  const res = await createUser(values);
  if (res.ok) {
    toast({ title: "User created" });
    return;
  }
  if (res.status === 422) {
    Object.entries(res.errors).forEach(([field, msgs]) =>
      form.setError(field as keyof Values, { message: msgs[0] })
    );
    form.setError("root", { message: res.message });
  } else if (res.status === 401) {
    router.replace("/login");
  } else {
    form.setError("root", { message: res.message });
  }
}
```

See `references/api-contract.md` for the full response shapes and the `isApiError` helper.

---

## Error Logging (dev vs production, Slack)

Two different audiences for an error:

- **Development** — show the **actual error** (message + stack) to the developer: throw/return it, log to console, let `error.tsx` render details. Fast feedback matters.
- **Production** — **never** surface system internals to the user. Show a **generic message** ("Something went wrong"), and ship the real error to **Slack** via an Incoming Webhook for the team to see.

One centralized `logError()` is the only place that branches on environment. Call it from `apiFetch`, every server action's catch, and `error.tsx`. It is **server-only** (the webhook URL is a server secret — never expose it to the client).

**It is also the only place that can be relied on to redact.** There are dozens of
call sites and one logger, so the scrub belongs here — see `security.md` rule 7.
Three things the reference implementation below must keep:

- `redact()` over the message, the stack **and** `ctx.extra`, stripping credential
  material both by key (`{ accessToken }`) and inside free text
  (`Authorization: Bearer …`, a bare JWT);
- **escaping for the sink's markup** — `where` and `message` can reach this from an
  unauthenticated caller through `reportError`, and Slack mrkdwn is markup: a
  message containing a triple backtick closes its own fence and continues as
  links, `<!channel>` mentions, or text impersonating another subsystem;
- **clamps** on message, stack and `where`, so one caller cannot post an unbounded
  body into the channel.

> `ctx.extra` is an unconstrained `Record<string, unknown>` — an open invitation to
> attach "just a bit of context" that turns out to be a session, a request body or
> a header set. It goes through the redactor like everything else.

```ts
// lib/log-error.ts — server-only centralized logger
import "server-only";
import { env } from "@/lib/env";

const isDev = env.NODE_ENV !== "production";

type ErrorContext = {
  where: string;            // e.g. "apiFetch GET /users", "createUser action"
  audience?: "client" | "admin";
  status?: number;
  extra?: Record<string, unknown>;
};

export async function logError(error: unknown, ctx: ErrorContext) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  if (isDev) {
    console.error(`[${ctx.where}]`, error); // full detail in dev
    return;
  }

  // production → Slack (fire-and-forget; never let logging throw into the request)
  const url = env.SLACK_ERROR_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `:rotating_light: *${ctx.where}*`,
        blocks: [
          { type: "section", text: { type: "mrkdwn", text: `:rotating_light: *${ctx.where}*\n\`\`\`${message}\`\`\`` } },
          { type: "context", elements: [{ type: "mrkdwn",
            text: `status: ${ctx.status ?? "—"} · audience: ${ctx.audience ?? "—"} · ${new Date().toISOString()}` }] },
          ...(stack ? [{ type: "section", text: { type: "mrkdwn", text: `\`\`\`${stack.slice(0, 2500)}\`\`\`` } }] : []),
        ],
      }),
    });
  } catch {
    /* swallow — logging must never break the user's request */
  }
}
```

Wire it into `apiFetch` (log non-2xx before throwing):

```ts
// inside lib/api-client.ts, replacing the bare throw
if (!res.ok) {
  const apiError = await buildApiError(res);
  await logError(apiError, { where: `apiFetch ${init?.method ?? "GET"} ${path}`, audience, status: apiError.status });
  throw apiError;
}
```

### The masking rule applies to every outbound path, not just actions

`ApiError.message` is **upstream content** — `buildApiError` takes it from
`body.message ?? res.statusText`, so it carries whatever the backend put in the
non-2xx body: framework exception text, SQL fragments, file paths, internal
hostnames on a connection fault.

Server actions are the path where this is usually remembered. The ones where it is
usually forgotten leak further, because they are reachable without a session:

- **route handlers** (`app/api/*`) — returning `{ message: err.message }` hands the
  string plus the upstream status straight to the browser;
- **public Server Components** — an unauthenticated visitor to a legal or FAQ page
  sees backend internals inside an `EmptyState`;
- **assistant/LLM tools** — the text is streamed into a chat transcript.

Extract the rule once and use it everywhere:

```ts
// lib/safe-error-message.ts
export const GENERIC_MESSAGE = "Something went wrong. Please try again.";

export function safeErrorMessage(err: unknown, fallback: string = GENERIC_MESSAGE): string {
  if (!isApiError(err)) return fallback;                                  // network/parse: no user contract
  if (err.status >= 500 && env.NODE_ENV === "production") return GENERIC_MESSAGE;
  return err.message;                                                     // 4xx is written for the user
}
```

4xx passes through — a 422's validation text and a 404's message are the whole
value of the response. A non-API error never passes through at all. Development
shows everything, which is what keeps a failing page debuggable.

> The same string is treated as operator-only when `logError` ships it to Slack.
> If it is not fit for the team channel, it is not fit for an anonymous visitor.

Server actions don't re-log `ApiError`s — `apiFetch` already logged those. They only log **unexpected** (non-API) errors, and in production return a generic message for 5xx instead of leaking internals:

```ts
} catch (err) {
  if (isApiError(err)) {
    // already logged inside apiFetch; just shape the result for the client
    const safe = err.status >= 500 && env.NODE_ENV === "production"
      ? "Something went wrong. Please try again."
      : err.message;
    return { ok: false, status: err.status, message: safe, errors: err.errors };
  }
  await logError(err, { where: "createUser action", audience: "admin" }); // unexpected only
  return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
}
```

`error.tsx` is a client boundary, so it can't import the server-only logger directly — it logs through a tiny server action, and renders dev detail vs a generic message:

```tsx
// app/(admin)/users/error.tsx
"use client";
import { useEffect } from "react";
import { reportError } from "@/lib/report-error"; // server action wrapper
import { env } from "@/lib/env"; // NEXT_PUBLIC_/NODE_ENV only — never a server secret

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportError(error.message, error.digest, "users/error"); }, [error]);

  const isDev = env.NODE_ENV !== "production";
  return (
    <div role="alert" className="space-y-3">
      <p>Something went wrong.</p>
      {isDev && <pre className="text-xs whitespace-pre-wrap">{error.message}</pre>}
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

```ts
// lib/report-error.ts — server action so the client can reach the server-only logger
//
// This one CANNOT be session-guarded: reporting failures on public pages is the
// whole point, and it is imported by unauthenticated boundaries. So it is the
// "deliberately public" case from security.md rule 1 — its action ID ships in
// the client bundle and an anonymous POST reaches it. Treat it as a public
// endpoint that writes into the operator's incident channel, and give it the
// three controls it can have.
"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { logError } from "@/lib/log-error";
import { clientIpFromHeaders } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";

// `where` names a boundary. An enum of every boundary name would be tightest but
// rots on the first new route; a charset that cannot express markup or a mention
// gives the same protection and stays true.
const WHERE = /^[\w\s/[\].:()-]{1,120}$/;

const reportSchema = z.object({
  message: z.string().trim().min(1).max(500),   // capped: no unbounded bodies
  digest: z.string().trim().max(120).optional(),
  where: z.string().trim().regex(WHERE),
});

export async function reportError(message: string, digest: string | undefined, where: string) {
  const parsed = reportSchema.safeParse({ message, digest, where });
  // Dropped silently, not thrown: the caller is a boundary that has already
  // failed once, and a rejected report must not become a second error inside it.
  if (!parsed.success) return;

  try {
    const incoming = await headers();
    const ip = clientIpFromHeaders((name) => incoming.get(name)); // edge-set only
    if (!checkRateLimit(`report-error:${ip ?? "unknown"}`, { signedIn: false }).ok) return;
  } catch {
    return; // no request scope; reporting is best-effort
  }

  await logError(new Error(parsed.data.message), {
    where: parsed.data.where,
    extra: parsed.data.digest ? { digest: parsed.data.digest } : undefined,
  });
}
```

> Why all three and not just escaping: `logError` escapes the Slack markup, which
> stops a message rendering as links or `<!channel>`. It does **not** stop one host
> looping the endpoint until the webhook's rate budget is exhausted — which
> suppresses the genuine `apiFetch` alerts sharing that webhook. Validation caps
> the payload, the limiter caps the volume, escaping caps the blast radius.

Required env: `SLACK_ERROR_WEBHOOK_URL` (server-only — **not** `NEXT_PUBLIC_`). Add it to `structure.md`'s env list.

> Rule of thumb: the user sees a generic message in production; the team sees the real error in Slack; the developer sees everything in dev. `error.tsx` `digest` is Next's stable hash for the server-side error — include it so a Slack alert can be matched to server logs.

---
