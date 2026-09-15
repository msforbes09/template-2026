import { connection } from "next/server";
import { isAssistantConfigured } from "@/lib/ai/vertex";
import { getClientSession } from "@/lib/auth/dal";
import { AssistantWidget } from "@/modules/assistant/components/assistant-widget";

// Server Component gate. Keeps the kill switch a server-side decision: with
// the assistant off (or Vertex unconfigured) the widget isn't rendered at all,
// so none of its client JS ships and there's no launcher to click into a 503.
//
// `await connection()` is load-bearing, not ceremony. Every (site) page is
// prerendered at build time, so without it isAssistantConfigured() would be
// evaluated during `next build` and its answer baked into the static shell —
// which is exactly wrong for a Docker image built once and configured at run
// time through compose env. Verified the hard way: with the flag off at build
// and on at runtime, the launcher never appeared. connection() stops the
// prerender here so the env is read per request instead.
//
// This is why the caller wraps it in <Suspense>: it makes this subtree a
// dynamic hole while the rest of the layout stays static (PPR).
//
// The session is read here only to pick the opening message — signed out that
// is "how do I register / sign in", signed in it's testing and credentials.
// getClientSession, NOT requireClientSession: the assistant is available signed
// out too, so no session is a normal state, not a redirect. This is not a
// boundary — which tools a visitor actually gets is still decided per request
// inside /api/chat from the cookie, never from this flag.
export async function AssistantMount() {
  await connection();
  if (!isAssistantConfigured()) return null;
  const session = await getClientSession();
  return <AssistantWidget signedIn={Boolean(session)} />;
}
