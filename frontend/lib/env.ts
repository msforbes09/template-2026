import { z } from "zod";

// Named so the production guard below can recognise it. Its only legitimate
// use is local development where no .env exists.
const DEV_AUTH_SECRET = "dev-only-insecure-secret-change-me-0000";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Backend base URL for server-side calls (future apiFetch/server actions).
  API_URL: z.url().default("http://localhost:8000/api"),
  SLACK_ERROR_WEBHOOK_URL: z.url().optional(),
  // Signs the local Better Auth session cookie for BOTH audiences
  // (lib/auth/better-auth.ts, lib/auth/client-better-auth.ts).
  //
  // The dev default is still here, because this module is imported by Client
  // Components too and a non-NEXT_PUBLIC_ var is undefined in the browser
  // bundle — making it required outright would throw on every client-side
  // parse. What is new is that the placeholder can no longer reach production.
  //
  // It used to be a silent hole: the literal is 39 chars, so .min(32) passed,
  // the parse never threw, and any deployment path that forgot the variable
  // booted with a signing key published in this repository — forgeable and
  // verifiable offline by anyone with a clone, for both cookie namespaces.
  // docker-compose.yml requires it (${VAR:?}), but `npm run start`, a plain
  // `docker run` of the built image, and any Vercel/ECS/Kubernetes manifest
  // that omits it were unprotected, with nothing logged to reveal it.
  //
  // NOTE this also fires during `next build`, which runs as NODE_ENV
  // production. That is intentional — the check cannot tell a build worker
  // from a server, since NEXT_PHASE is not propagated to the workers that
  // collect page data (verified). Builds therefore pass a throwaway value
  // rather than the guard carrying a bypass that could be set in production
  // by mistake; the Dockerfile generates one in-layer.
  BETTER_AUTH_SECRET: z
    .string()
    .min(32)
    .default(DEV_AUTH_SECRET)
    .superRefine((value, ctx) => {
      // SERVER ONLY. This module is imported by Client Components too, and
      // BETTER_AUTH_SECRET is not NEXT_PUBLIC_, so in the browser it is always
      // undefined and the placeholder default always applies. Without this
      // guard the parse throws at module evaluation in every production client
      // bundle — taking out every error.tsx that reads env.NODE_ENV, which is
      // most of them. The very reason the default exists (see above) is the
      // reason the check cannot run here.
      if (typeof window !== "undefined") return;
      if (process.env.NODE_ENV === "production" && value === DEV_AUTH_SECRET) {
        ctx.addIssue({
          code: "custom",
          message:
            "BETTER_AUTH_SECRET is unset — it is falling back to the placeholder committed in " +
            "lib/env.ts, which is public, and NODE_ENV is production. Set a real 32+ character " +
            "secret (openssl rand -base64 32). If you are seeing this during `next build`: the " +
            "build also runs as NODE_ENV=production, and any throwaway 32+ char value satisfies " +
            "it — nothing is signed at build time (see the Dockerfile's build step).",
        });
      }
    }),

});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  // Same backend, exposed to the browser: auth endpoints are hit directly
  // from the client (see modules/admin/lib/admin-auth-client.ts), never
  // through a Next.js route — so the browser needs this URL in its bundle.
  NEXT_PUBLIC_API_URL: z.url().default("http://localhost:8000/api"),
  // Cloudflare Turnstile public site key, rendered on the admin login form.
  // Defaults to Cloudflare's always-passes test key so dev/build never breaks
  // without a real one configured.
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).default("1x00000000000000000000AA"),
  // Identifies this portal to the eGov gateway in the API-testing collection
  // (api-docs CollectionViewer). Nothing to do with signing in — eGovPH SSO
  // login was removed — which is why the matching BASE_URL is gone and this
  // one stayed.
  NEXT_PUBLIC_EGOV_SSO_PARTNER_CODE: z.string().min(1).default("TEST_AGENCY"),
  // Laravel Reverb (Pusher-protocol websocket) connection config for the live
  // gateway-log feeds (modules/gateway-logs). Echo runs in the browser, so
  // these must be public. Defaults match the backend team's staging instance.
  NEXT_PUBLIC_REVERB_APP_KEY: z.string().min(1).default("2uqlqvzghsgamqp93hzp"),
  NEXT_PUBLIC_REVERB_HOST: z.string().min(1).default("egov-api-ws.oueg.info"),
  NEXT_PUBLIC_REVERB_PORT: z.coerce.number().int().positive().default(443),
  // env vars only ever arrive as strings; pusher-js wants a real boolean.
  NEXT_PUBLIC_REVERB_FORCE_TLS: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  // Enforced client-side before an upload even starts (modules/uploads/
  // components/file-uploader.tsx) — matches the backend API's real cap so
  // an oversized file is rejected immediately instead of failing only
  // after a full upload attempt. Configurable here (rather than a
  // hardcoded constant) so it can be changed without a code change if the
  // backend's cap ever changes.
  NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(5),
});

const server = serverEnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  API_URL: process.env.API_URL,
  SLACK_ERROR_WEBHOOK_URL: process.env.SLACK_ERROR_WEBHOOK_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
});

const client = clientEnvSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  NEXT_PUBLIC_EGOV_SSO_PARTNER_CODE: process.env.NEXT_PUBLIC_EGOV_SSO_PARTNER_CODE,
  NEXT_PUBLIC_REVERB_APP_KEY: process.env.NEXT_PUBLIC_REVERB_APP_KEY,
  NEXT_PUBLIC_REVERB_HOST: process.env.NEXT_PUBLIC_REVERB_HOST,
  NEXT_PUBLIC_REVERB_PORT: process.env.NEXT_PUBLIC_REVERB_PORT,
  NEXT_PUBLIC_REVERB_FORCE_TLS: process.env.NEXT_PUBLIC_REVERB_FORCE_TLS,
  NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB: process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB,
});

export const env = { ...server, ...client };
