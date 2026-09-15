"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Maximize2, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ASSISTANT_PAGE_PATH } from "@/modules/assistant/lib/assistant-page-path";
import { AssistantChat } from "@/modules/assistant/components/assistant-chat";

// The floating frame around AssistantChat: launcher, panel chrome, and a way
// out to the full-page view. A client leaf mounted from the (site) layout —
// the shell around it stays a Server Component.
export function AssistantWidget({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // The dedicated page already IS the assistant; a floating copy of it in the
  // corner would be a second, separate conversation on the same screen.
  if (pathname === ASSISTANT_PAGE_PATH) return null;

  return (
    <>
      <Button
        size="icon-lg"
        aria-expanded={open}
        aria-controls="assistant-panel"
        aria-label={open ? "Close the assistant" : "Open the assistant"}
        className="fixed bottom-5 right-5 z-40 size-12 rounded-full shadow-lg"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X aria-hidden /> : <MessageCircle aria-hidden />}
      </Button>

      {/* Hidden rather than unmounted when closed. A generated credential's
          plaintext lives in CredentialActionCard's own state and is shown
          exactly once — unmounting the panel would destroy it for good, so
          closing the widget must not tear the conversation down. `hidden` is a
          display utility and tailwind-merge drops the earlier `flex`, so this
          genuinely hides it (and takes it out of the a11y tree) rather than
          losing to the flex class. */}
      <div
        id="assistant-panel"
        role="dialog"
        aria-label="Portal assistant"
        className={cn(
          // Wider and taller than a plain chat bubble needs, because the test
          // flow renders the real TryItPanel inline — headers, body editor and
          // response viewer. Still capped to the viewport on small screens.
          "fixed bottom-20 right-5 z-40 flex h-[min(38rem,calc(100dvh-7rem))] w-[min(30rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl",
          !open && "hidden",
        )}
      >
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Bot className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Portal assistant</p>
            <p className="truncate text-xs text-muted-foreground">
              Answers from the live API catalog
            </p>
          </div>
          {/* Opens the full-page view. It starts a fresh conversation rather
              than carrying this one over — see the note in AssistantChat — so
              the label says "open", not "expand". */}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open the assistant on its own page"
            nativeButton={false}
            render={<Link href={ASSISTANT_PAGE_PATH} />}
          >
            <Maximize2 aria-hidden />
          </Button>
        </header>

        <AssistantChat size="compact" signedIn={signedIn} />
      </div>
    </>
  );
}
