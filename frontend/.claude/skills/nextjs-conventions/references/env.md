# Environment Variables (Zod-validated)

Read when adding/using env vars or wiring config. All env access goes through a single Zod-parsed `lib/env.ts` so a missing or malformed var fails loudly at boot, not as a runtime `undefined` deep in a request.

Rules:
- **Never read `process.env.X` directly** in app code — import from `@/lib/env`. The only exceptions are inside `lib/env.ts` itself and Next's own config files.
- Server-only secrets must **not** be prefixed `NEXT_PUBLIC_`. Anything `NEXT_PUBLIC_*` ships to the browser — only truly public values get that prefix.
- Split the schema into a server object and a client object so a server secret can never be referenced from a client component by mistake.
- **A server-only secret never carries `.default()`.** This is the single mechanism that defeats the fail-loud guarantee above: a placeholder long enough to satisfy its own validator means the parse never throws, and a deployment that forgot the variable boots on a value published in the repository — silently, with nothing logged to reveal it. `.optional()` on a secret has the same effect one step later.

If a default is genuinely unavoidable — `lib/env.ts` is imported by Client Components too, and a required server var resolves to `undefined` in the browser bundle, so making it required outright throws on every client-side parse — then keep the default and **reject it in production**:

```ts
const DEV_AUTH_SECRET = "dev-only-insecure-secret-change-me-0000";

BETTER_AUTH_SECRET: z
  .string()
  .min(32)
  .default(DEV_AUTH_SECRET)
  .superRefine((value, ctx) => {
    if (process.env.NODE_ENV === "production" && value === DEV_AUTH_SECRET) {
      ctx.addIssue({ code: "custom", message: "BETTER_AUTH_SECRET is unset in production." });
    }
  }),
```

A `docker-compose.yml` using `${VAR:?}` protects one documented path. `npm run start`, a plain `docker run` of the built image, and any Vercel/ECS/Kubernetes manifest that omits the variable are not covered by it — the schema is the only place that sees every path.

```ts
// lib/env.ts
import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_URL: z.string().url(),                       // backend base URL
  BETTER_AUTH_SECRET: z.string().min(32),          // no .default() — see the rule above
  SLACK_ERROR_WEBHOOK_URL: z.string().url().optional(), // optional → logging no-ops if unset
});

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),          // metadataBase / OG absolute URLs
});

// Validate once. Throwing here stops the build/boot with a clear message.
const _server = serverSchema.safeParse(process.env);
if (!_server.success) {
  console.error("❌ Invalid server env:", _server.error.flatten().fieldErrors);
  throw new Error("Invalid server environment variables");
}

const _client = clientSchema.safeParse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
if (!_client.success) {
  console.error("❌ Invalid client env:", _client.error.flatten().fieldErrors);
  throw new Error("Invalid client environment variables");
}

export const env = { ..._server.data, ..._client.data };
```

Usage everywhere else:

```ts
import { env } from "@/lib/env";

await fetch(`${env.API_URL}/users`);              // not process.env.API_URL
if (env.SLACK_ERROR_WEBHOOK_URL) { /* log */ }
```

> Keep a committed `.env.example` listing every key (no values) so the schema and the example stay in sync. When you add a var to the schema, add it to `.env.example` in the same change.

> `BETTER_AUTH_SECRET` signs the session cookie for **every** audience instance (they share one secret — `auth.md`), so it is not scoped to one surface: anything derived from it is forgeable across all of them at once. Unique per environment, never committed, rotate on any suspected exposure — including a log that may have captured it.

> Note on client env: Next inlines `NEXT_PUBLIC_*` at build time by literal `process.env.NEXT_PUBLIC_X` references, so `lib/env.ts` reads them explicitly (as above) rather than spreading `process.env`, which wouldn't be inlined.
