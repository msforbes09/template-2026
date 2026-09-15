import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";
import { assistantModel, isAssistantConfigured } from "@/lib/ai/vertex";
import { getClientSession } from "@/lib/auth/dal";
import { logError } from "@/lib/log-error";
import { parseAssistantPathname } from "@/modules/assistant/lib/page-context";
import { pruneUnansweredToolCalls } from "@/modules/assistant/lib/prune-messages";
import { checkRateLimit } from "@/modules/assistant/lib/rate-limit";
import { clientIpFromHeaders } from "@/lib/client-ip";
import { buildSystemPrompt, type PromptPageContext } from "@/modules/assistant/lib/system-prompt";
import { buildTools } from "@/modules/assistant/lib/tools";
import { getPublicApiCatalogs } from "@/modules/site/lib/get-public-api-catalog";

// The assistant's streaming endpoint.
//
// This MUST run on the Node runtime — the Vertex provider authenticates
// through google-auth-library, which reads the service-account key off disk,
// something the edge runtime can't do. That's the default here and there is
// deliberately no `export const runtime`: cacheComponents rejects the runtime
// segment config outright ("not compatible with nextConfig.cacheComponents"),
// so pinning it fails the build. Don't add it back — switching this route to
// edge would require the /edge provider entrypoint and raw key material in
// env instead of a mounted file.

// How many tool round-trips the model may take before it must answer. Enough
// for listApiCatalogs -> showApiCatalogs -> getApiCatalog -> getApiEndpoint ->
// answer, with headroom; low enough that a confused model can't loop up a
// bill. Raised from 5 when the catalog lookup and the on-screen picker became
// two tools — a browse-then-read turn can now legitimately spend one more step
// than it used to, and hitting the cap means the user gets tool cards with no
// answer under them.
const MAX_STEPS = 6;

// Longer than any real route; a cap so a huge string can't be shipped here at
// all, before anything tries to parse it.
const MAX_PATHNAME_CHARS = 512;

// Turns the client's claimed pathname into something safe to state as fact in
// the system prompt — or nothing.
//
// This is the ONLY client-supplied value that reaches the prompt, so it never
// travels as text. The path is matched against known route shapes, and a
// catalog identifier still has to name a really-published catalog; what gets
// interpolated is the name from OUR catalog data, never a character the caller
// sent. A page we don't recognise simply contributes nothing, which is the same
// behaviour as before this existed.
async function resolvePageContext(value: unknown): Promise<PromptPageContext | null> {
  if (typeof value !== "string" || !value.startsWith("/") || value.length > MAX_PATHNAME_CHARS) {
    return null;
  }

  const context = parseAssistantPathname(value);
  if (context.kind === "other") return null;
  if (context.kind !== "catalog") return { kind: context.kind };

  try {
    const catalogs = await getPublicApiCatalogs();
    const match = catalogs.find((catalog) => catalog.identifier === context.identifier);
    // An identifier that doesn't resolve is dropped rather than passed along:
    // the model must never be told the user is reading an API that isn't there.
    if (!match) return null;
    // A catalog's name is nullable; the identifier is not, and reads fine as a
    // fallback ("egov-sso") where an empty name would read as a bug.
    return { kind: "catalog", identifier: match.identifier, name: match.name ?? match.identifier };
  } catch {
    // The catalog read failing is not a reason to fail the chat — it just
    // means this turn has no page context.
    return null;
  }
}

export async function POST(req: Request) {
  if (!isAssistantConfigured()) {
    return NextResponse.json({ message: "The assistant is not available." }, { status: 503 });
  }

  // getClientSession, NOT requireClientSession — this is a JSON endpoint hit by
  // fetch(), so a redirect would be wrong (see app/api/galleries/route.ts), and
  // more importantly a missing session is NOT an error here: signed-out callers
  // are supported, they just get the public toolset.
  const session = await getClientSession();
  const signedIn = Boolean(session);

  let messages: UIMessage[];
  let rawPathname: unknown;
  try {
    ({ messages, pathname: rawPathname } = await req.json());
    if (!Array.isArray(messages)) throw new Error("messages must be an array");
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const pageContext = await resolvePageContext(rawPathname);

  // Only a genuine user turn counts against the limit.
  //
  // The client auto-resubmits after every client-side tool result
  // (sendAutomaticallyWhen), so ONE thing the user does — pick an endpoint,
  // confirm a credential, run a test — arrives here as several POSTs whose
  // last message is the assistant's, carrying tool output. Counting those
  // throttled a normal test flow almost immediately: the limiter fired on the
  // 6th request of a minute, and the widget showed it as a generic "something
  // went wrong". Continuations are work the user already asked for.
  const isUserTurn = messages.at(-1)?.role === "user";
  if (isUserTurn) {
    // Keyed on something the caller cannot choose.
    //
    // This read x-forwarded-for.split(",")[0], which nginx builds with
    // $proxy_add_x_forwarded_for — it APPENDS the peer, so index 0 is whatever
    // the client sent. A fresh random value per request meant a fresh bucket,
    // and the anonymous ceiling did not exist: every request reached a billed
    // Vertex generation. clientIpFromHeaders now reads only edge-set headers.
    //
    // The signed-in half keys on the USER, not the session id. A session id is
    // minted per sign-in, so keying on it let one account hold as many buckets
    // as it cared to open — and the signed-in ceiling is the higher of the two.
    const clientIp = clientIpFromHeaders((name) => req.headers.get(name));
    const key = session?.user?.id
      ? `user:${session.user.id}`
      : clientIp
        ? `ip:${clientIp}`
        : "anonymous";
    const limit = checkRateLimit(key, { signedIn });
    if (!limit.ok) {
      return NextResponse.json(
        { message: "You're sending messages too quickly. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }
  }

  try {
    const result = streamText({
      model: assistantModel(),
      system: buildSystemPrompt({ signedIn, pageContext }),
      // Pruned first: a card the user ignored in favour of typing leaves a tool
      // call with no result, which the provider rejects — and it does so inside
      // the stream, where this try/catch can't see it. See prune-messages.ts.
      messages: await convertToModelMessages(pruneUnansweredToolCalls(messages)),
      // Decided here from the session — never from anything in the request
      // body. This is what actually keeps a signed-out caller away from the
      // citizen tools; the system prompt only explains the situation.
      tools: buildTools({ signedIn }),
      stopWhen: isStepCount(MAX_STEPS),
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  } catch (err) {
    // Reached for setup failures (bad key file path, wrong project, revoked
    // service account) — token-level failures surface inside the stream.
    // Logged with the real error; the caller gets a generic message.
    await logError(err, { where: "POST /api/chat", audience: signedIn ? "client" : "anonymous" });
    return NextResponse.json({ message: "The assistant is unavailable right now." }, { status: 500 });
  }
}
