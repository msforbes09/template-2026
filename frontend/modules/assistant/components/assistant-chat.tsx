"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { AlertTriangle, Send, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { AssistantMessage } from "@/modules/assistant/components/assistant-message";
import { assistantOpener } from "@/modules/assistant/lib/openers";
import { quickReplyOptions } from "@/modules/assistant/lib/quick-replies";
import {
  asToolPart,
  INTERACTIVE_TOOL_PARTS,
  TOOL_CARDS,
  ToolActivity,
} from "@/modules/assistant/components/tool-cards";

// The conversation itself — message list, tool cards and composer. Shared by
// the floating widget and the full-page view at /assistant, which differ only
// in the frame around this.
//
// Each mount owns its own useChat instance, so the widget and the page are
// separate conversations rather than a synced one. That's deliberate: sharing
// them would mean lifting chat state into a provider above the (site) layout,
// and a generated credential's one-time reveal lives in a tool card's local
// state — moving that around is exactly the kind of change that loses it.
//
// Conversation state is in memory only. Nothing is persisted anywhere.

// The AI SDK surfaces a failed request as an Error whose message is usually
// the response body. Show what actually happened when we can recognise it —
// "something went wrong" for a rate limit sent people looking for a bug that
// wasn't there. Anything unrecognised still gets the generic line rather than
// a raw stack or JSON.
function errorMessage(error: Error | undefined): string {
  const raw = error?.message ?? "";
  if (/too quickly|429/i.test(raw)) {
    return "You're sending messages a bit fast. Wait a few seconds and try again.";
  }
  if (/not available|503/i.test(raw)) {
    return "The assistant isn't available right now.";
  }
  if (/sign in|401/i.test(raw)) {
    return "Your session expired. Sign in again to continue.";
  }
  return "Something went wrong. Please try again in a moment.";
}

export function AssistantChat({
  // The page view has room to breathe; the panel doesn't.
  size = "compact",
  // Decided on the server and passed down, so the opening message is right on
  // first paint rather than after a client-side session check. It only chooses
  // which copy to show — what a caller may actually DO is still decided per
  // request in /api/chat from the session cookie, never from this.
  signedIn = false,
}: {
  size?: "compact" | "roomy";
  signedIn?: boolean;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Drives the page-specific opening suggestions below.
  const pathname = usePathname();
  const opener = assistantOpener(pathname, signedIn);

  // Every request carries the page the user is on, so "this API" resolves to
  // whatever they have open.
  //
  // Two deliberate choices. The transport is built ONCE (useState initializer)
  // rather than inline in the useChat call, which would hand it a new transport
  // on every render. And the path is read from location at SEND time rather
  // than closed over: a closure would freeze the pathname from whichever render
  // created the transport, and this hook also fires for the automatic
  // tool-result resubmissions, which don't go through submit() at all — so
  // reading it here is what keeps context attached for a whole test flow, not
  // just the first message.
  //
  // Untrusted either way: the server whitelists the route shape and looks the
  // identifier up in real catalog data before any of it reaches the prompt.
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ body, messages: outgoing }) => ({
          body: {
            ...body,
            messages: outgoing,
            pathname: typeof window === "undefined" ? undefined : window.location.pathname,
          },
        }),
      }),
  );

  const { messages, sendMessage, addToolOutput, setMessages, stop, status, error } = useChat({
    transport,
    // The action tools have no server-side execute, so their results come from
    // the cards below; this resumes the model once one lands.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const busy = status === "submitted" || status === "streaming";
  const roomy = size === "roomy";

  // Keep the newest message in view as it streams.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Fallback answers for a closed question the model asked in prose instead of
  // through askUser. Only for the newest message, only once it has finished
  // streaming, and only when nothing interactive already rendered.
  const quickReplies = (() => {
    if (busy) return null;
    const last = messages.at(-1);
    if (!last || last.role !== "assistant") return null;
    if (last.parts.some((part) => INTERACTIVE_TOOL_PARTS.has(part.type))) return null;
    const text = last.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join(" ");
    return quickReplyOptions(text);
  })();

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <>
      {/* Announces that a reply is happening, without reading the stream aloud.
          Putting aria-live on the message text itself would re-announce the
          whole answer on every token — unusable. A screen reader user hears the
          state change and reads the message with normal navigation, the same
          way a sighted user watches it fill in. */}
      <p aria-live="polite" role="status" className="sr-only">
        {busy ? "The assistant is replying." : messages.length > 0 ? "Reply ready." : ""}
      </p>

      {messages.length > 0 && (
        <div className="flex shrink-0 justify-end border-b border-border px-3 py-1.5">
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs font-normal">
                <Trash2 aria-hidden data-icon="inline-start" />
                New chat
              </Button>
            }
            title="Start a new conversation?"
            description="This clears the messages above. If a credential was generated in this chat, its secret is shown only here and cannot be retrieved afterwards — copy it first."
            confirmLabel="Clear"
            destructive
            onConfirm={async () => {
              stop();
              setMessages([]);
            }}
          />
        </div>
      )}

      {/* The scroller is full-bleed so the scrollbar sits at the window edge,
          while the messages inside keep a readable measure. Full-width message
          text at 1600px would be unreadable. */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div
          className={cn(
            "flex flex-col",
            roomy ? "mx-auto w-full max-w-3xl gap-5 px-4 py-8 sm:px-6" : "gap-4 px-4 py-4",
          )}
        >
        {messages.length === 0 && (
          /* The opening message. Written as prose + a list of subjects rather
             than only buttons: the buttons are the shortcuts, the list is what
             tells someone the shape of what this thing knows. Signed out that
             is registration and the public catalog; signed in it's testing,
             credentials and their own account — see openers.ts. */
          <div className="flex flex-col gap-3">
            <p className={cn("leading-relaxed", roomy ? "text-base" : "text-sm")}>
              {opener.intro}
            </p>
            <ul
              className={cn(
                "flex list-disc flex-col gap-1 pl-4 leading-relaxed text-muted-foreground",
                roomy ? "text-sm" : "text-xs",
              )}
            >
              {opener.topics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
            <p className={cn("text-muted-foreground", roomy ? "text-sm" : "text-xs")}>
              Ask in your own words, or start with one of these:
            </p>
            <div className={cn("flex gap-1.5", roomy ? "flex-wrap" : "flex-col items-start")}>
              {opener.suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="h-auto py-1.5 text-left text-xs font-normal"
                  onClick={() => submit(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex flex-col gap-2 text-sm",
              message.role === "user" ? "items-end" : "items-start",
            )}
          >
            {message.parts.map((part, index) => {
              const key = `${message.id}-${index}`;

              if (part.type === "text") {
                return message.role === "user" ? (
                  <p
                    key={key}
                    className={cn(
                      "whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground",
                      roomy ? "max-w-[75%]" : "max-w-[85%]",
                    )}
                  >
                    {part.text}
                  </p>
                ) : (
                  <AssistantMessage key={key} text={part.text} roomy={roomy} />
                );
              }

              // Every tool that renders something has one entry in TOOL_CARDS.
              // Anything NOT in it is a read-only lookup: show that work is
              // happening, then nothing — the model's prose is the answer.
              const tool = asToolPart(part);
              if (!tool) return null;

              const card = TOOL_CARDS[tool.type];
              if (!card) {
                return tool.state === "input-streaming" || tool.state === "input-available" ? (
                  <ToolActivity key={key} label="Looking that up…" />
                ) : null;
              }

              // Uniform for every card, so each one only describes its own
              // states rather than repeating this.
              if (tool.state === "output-error") {
                return (
                  <p key={key} className="text-xs text-destructive">
                    {tool.errorText}
                  </p>
                );
              }

              return (
                <div key={key} className="contents">
                  {card.render({ part: tool, addToolOutput, submit })}
                </div>
              );
            })}
          </div>
        ))}

        {quickReplies && (
          <div className="flex flex-wrap gap-1.5">
            {quickReplies.map((option) => (
              <Button
                key={option}
                variant="outline"
                size="sm"
                className="h-auto py-1.5 text-xs font-normal"
                onClick={() => submit(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        )}

        {busy && messages.at(-1)?.role === "user" && <ToolActivity label="Thinking…" />}

        {error && (
          <p
            role="alert"
            className="flex items-start gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
            {errorMessage(error)}
          </p>
        )}
        </div>
      </div>

      {/* Border on the full-width wrapper, composer centred inside it — so the
          rule spans the window while the input lines up with the messages. */}
      <div className="border-t border-border">
        <form
          className={cn(
            "flex w-full items-center gap-2",
            roomy ? "mx-auto max-w-3xl px-4 py-4 sm:px-6" : "p-3",
          )}
          onSubmit={(event) => {
            event.preventDefault();
            submit(input);
          }}
        >
        <label htmlFor={`assistant-input-${size}`} className="sr-only">
          Message the assistant
        </label>
        <input
          id={`assistant-input-${size}`}
          value={input}
          onChange={(event) => setInput(event.currentTarget.value)}
          placeholder="Ask a question…"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
          {/* While a reply is streaming this is a stop button, not a disabled
              send. A wrong answer used to have to finish — the user could
              neither interrupt it nor stop paying for it. */}
          {busy ? (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label="Stop generating"
              onClick={() => stop()}
            >
              <Square aria-hidden className="fill-current" />
            </Button>
          ) : (
            <Button type="submit" size="icon-sm" aria-label="Send" disabled={!input.trim()}>
              <Send aria-hidden />
            </Button>
          )}
        </form>
      </div>
    </>
  );
}
