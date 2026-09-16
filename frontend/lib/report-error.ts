"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { logError } from "@/lib/log-error";
import { clientIpFromHeaders } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";

// Reports a client-side render failure from an error.tsx boundary.
//
// This is an exported Server Action imported by ~40 error boundaries, several
// of them unauthenticated (app/(site)/error.tsx, app/(auth)/login/error.tsx),
// so its action ID ships in publicly served JS and an anonymous POST carrying
// a Next-Action header reaches it — Next's only gate is an Origin/Host match
// any HTTP client satisfies. It cannot be session-guarded, because the whole
// point is to report failures on public pages.
//
// It therefore has to be treated as an unauthenticated public endpoint that
// writes into the operator's incident channel. Three controls, since it can't
// have a guard:
//
//   1. Validation — bounded length and a restricted charset, so neither field
//      can carry markup or an unbounded body.
//   2. Rate limiting — keyed on the edge-derived IP, so one host cannot flood
//      the channel and exhaust the webhook's budget, which would suppress the
//      real apiFetch alerts that share it.
//   3. Escaping at the sink — logError() escapes Slack mrkdwn, so a message
//      cannot close its code fence and continue as markup (links, <!channel>,
//      text impersonating another subsystem).
//
// Escaping alone was not enough: without a limiter the flooding vector stands
// even when every individual message is inert.

// `where` names a boundary ("app/(site)/projects/[uuid]", "AdminUsersList").
// An enum of every boundary name would be the tightest gate, but there are ~40
// and it would rot on the first new route — a charset that cannot express
// markup or a mention gets the same protection and stays true.
const WHERE = /^[\w\s/[\].:()-]{1,120}$/;

const reportSchema = z.object({
  message: z.string().trim().min(1).max(500),
  digest: z.string().trim().max(120).optional(),
  where: z.string().trim().regex(WHERE),
});

// 10/minute per address, the anonymous tier of the shared limiter. An error
// boundary that reports more than that per minute is looping, not informing.
const RATE_LIMIT_KEY_PREFIX = "report-error:";

export async function reportError(message: string, digest: string | undefined, where: string) {
  const parsed = reportSchema.safeParse({ message, digest, where });
  // Silently dropped rather than thrown back: the caller is an error boundary
  // that has already failed once, and a rejected report must not become a
  // second error inside it.
  if (!parsed.success) return;

  try {
    const incoming = await headers();
    const ip = clientIpFromHeaders((name) => incoming.get(name));
    const limit = checkRateLimit(`${RATE_LIMIT_KEY_PREFIX}${ip ?? "unknown"}`, {
      signedIn: false,
    });
    if (!limit.ok) return;
  } catch {
    // No request scope to read (or the limiter threw). Reporting is
    // best-effort; a failure here must not break the boundary.
    return;
  }

  await logError(new Error(parsed.data.message), {
    where: parsed.data.where,
    extra: parsed.data.digest ? { digest: parsed.data.digest } : undefined,
  });
}
