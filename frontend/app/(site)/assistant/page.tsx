import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Bot } from "lucide-react";
import { isAssistantConfigured } from "@/lib/ai/vertex";
import { getClientSession } from "@/lib/auth/dal";
import { AssistantChat } from "@/modules/assistant/components/assistant-chat";

export const metadata: Metadata = {
  title: "Assistant",
  description:
    "Ask about the APIs available on the eGov API Developer Portal, how to integrate them, and your own gateway usage.",
  // Not indexed: the page is a live tool with no crawlable content of its own,
  // and its answers come from the catalog pages that ARE indexed.
  robots: { index: false, follow: false },
};

// `await connection()` for the same reason AssistantMount needs it: this route
// would otherwise be prerendered at build time and bake in whatever
// ASSISTANT_ENABLED happened to be then, which is wrong for an image built
// once and configured through runtime env.
async function AssistantGate() {
  await connection();
  // 404 rather than an "unavailable" page — with the assistant switched off
  // this route doesn't meaningfully exist, and nothing links to it.
  if (!isAssistantConfigured()) notFound();
  // Same as AssistantMount: the session only chooses the opening message here,
  // and a missing one is a supported state rather than a redirect.
  const session = await getClientSession();
  return <AssistantChat size="roomy" signedIn={Boolean(session)} />;
}

function AssistantSkeleton() {
  return <div aria-hidden className="flex-1 animate-pulse bg-muted/30" />;
}

export default function AssistantPage() {
  return (
    // Fills the layout's <main>, which is a flex column for exactly this — so
    // the chat owns the window instead of sitting in a card on a page. min-h-0
    // lets the message list scroll inside it rather than growing the page.
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Slim bar, not a masthead — a big heading above a chat surface makes
          it read as a page containing a widget, which is what this stopped
          being. */}
      <header className="flex shrink-0 items-center gap-2.5 border-b border-border px-4 py-3 sm:px-6">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Bot className="size-4" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold tracking-tight">Portal assistant</h1>
          <p className="truncate text-xs text-muted-foreground">
            Answers from the live API catalog and your own account
          </p>
        </div>
      </header>

      <Suspense fallback={<AssistantSkeleton />}>
        <AssistantGate />
      </Suspense>
    </div>
  );
}
