# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

# ---------------------------------------------------------------------------
# deps: install dependencies in their own layer so they're only re-run when
# package.json/package-lock.json change.
# ---------------------------------------------------------------------------
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# builder: type-checks and produces the standalone .next output.
# ---------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time (see
# lib/env.ts) — they must be passed as build args, not just container env,
# or every deployment silently ships the schema's dev defaults. Defaults
# below mirror .env.example for a working `docker build` with no args.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_API_URL=https://egov-api-ws.oueg.info/api/v1
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
ARG NEXT_PUBLIC_EGOV_SSO_PARTNER_CODE=TEST_AGENCY
ARG NEXT_PUBLIC_REVERB_APP_KEY=2uqlqvzghsgamqp93hzp
ARG NEXT_PUBLIC_REVERB_HOST=egov-api-ws.oueg.info
ARG NEXT_PUBLIC_REVERB_PORT=443
ARG NEXT_PUBLIC_REVERB_FORCE_TLS=true
ARG NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB=5

# API_URL is the one server-side var that also matters at BUILD time. It is not
# inlined into any bundle, but `next build` prerenders the public pages, and
# those reads (the API catalog, the project showcase, the sitemap) go through
# it. Without it the schema default (http://localhost:8000/api) applies inside
# the image, nothing answers, and every public page is built from a failed
# read: the catalog and project detail pages silently disappear from the
# output. It is set for the builder stage only and never carried into the
# runtime stage, so the running container still takes it from its environment
# and one image is not pinned to one backend.
ARG API_URL=https://egov-api-ws.oueg.info/api/v1
ENV API_URL=$API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    NEXT_PUBLIC_EGOV_SSO_PARTNER_CODE=$NEXT_PUBLIC_EGOV_SSO_PARTNER_CODE \
    NEXT_PUBLIC_REVERB_APP_KEY=$NEXT_PUBLIC_REVERB_APP_KEY \
    NEXT_PUBLIC_REVERB_HOST=$NEXT_PUBLIC_REVERB_HOST \
    NEXT_PUBLIC_REVERB_PORT=$NEXT_PUBLIC_REVERB_PORT \
    NEXT_PUBLIC_REVERB_FORCE_TLS=$NEXT_PUBLIC_REVERB_FORCE_TLS \
    NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB=$NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB

# Deliberately NOT build args: ASSISTANT_ENABLED, GOOGLE_VERTEX_PROJECT,
# GOOGLE_VERTEX_LOCATION, GOOGLE_VERTEX_MODEL, GOOGLE_VERTEX_KEY_FILE.
#
# Only NEXT_PUBLIC_* need baking, because only those are inlined into the
# client bundle. The assistant's vars are server-side and read per request, so
# passing them here would bake one deployment's configuration into the image
# and, worse, make the kill switch a property of the build: the same image
# could no longer be enabled on staging and disabled in production. That is
# also why AssistantMount awaits connection() — without it the flag would be
# evaluated during this `npm run build` and frozen into the prerendered pages.
#
# They arrive as container environment instead (see docker-compose.yml), and
# the service-account key is mounted at runtime rather than copied in
# (.dockerignore excludes it from the build context above).
ENV NEXT_TELEMETRY_DISABLED=1

# BETTER_AUTH_SECRET is supplied here as a THROWAWAY value, generated inside
# this layer and never persisted.
#
# lib/env.ts refuses to boot on the committed placeholder when NODE_ENV is
# production, which is what stops a deployment silently signing cookies with a
# key published in this repository. `next build` also runs as NODE_ENV
# production, so without this the guard fires during "Collecting page data"
# and the image cannot be built at all.
#
# A random value is right rather than a bypass: the secret signs session
# cookies at REQUEST time and the build signs nothing, so any 32+ char string
# satisfies the parse and none of it survives. It is not NEXT_PUBLIC_, so it is
# never inlined into a bundle (see the note on build args above), and setting
# it inline on this RUN keeps it out of the image's ENV and history — unlike an
# ARG, whose value `docker history` would show. The real secret arrives as
# container environment at runtime (docker-compose.yml requires it).
RUN BETTER_AUTH_SECRET="$(head -c 32 /dev/urandom | base64)" npm run build

# ---------------------------------------------------------------------------
# runner: minimal production image — only the standalone trace output, no
# node_modules, source, or dev dependencies.
# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# .next/standalone doesn't include .next/static or public (see the
# standalone output docs) — copy them in manually, owned by the runtime user.
RUN mkdir .next && chown nextjs:nodejs .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
