import type { UIMessage } from "ai";

// Drops tool calls that were never answered.
//
// The action tools have no server-side execute: the model calls one, the turn
// pauses, and a card in the browser supplies the result. If the user ignores
// the card and types instead — picks up the phone, changes their mind, answers
// the question in prose — that call stays in the history with an input and no
// output forever.
//
// A model provider rejects that history: a function call with no response is
// not a conversation it can continue. The failure surfaces INSIDE the stream
// (an "error" chunk after "start"), so it never reaches the route's try/catch,
// never gets logged, and the user just sees "Something went wrong. Please try
// again in a moment." — on every subsequent message, because the bad part is
// still in the history. The conversation is effectively dead.
//
// Typing instead of clicking is a normal thing to do, so the fix is to make the
// history valid rather than to insist the user click. Dropping the call loses
// nothing important: the model's own text ("Which endpoint?") is still there,
// and the user's reply usually answers it.
//
// Only UNANSWERED calls are dropped. An answered one carries a result the model
// needs — a test's response body, a chosen endpoint — and removing it would
// erase what happened.

const ANSWERED_STATES = new Set(["output-available", "output-error"]);

function isUnansweredToolPart(part: { type: string; state?: string }): boolean {
  const isToolPart = part.type.startsWith("tool-") || part.type === "dynamic-tool";
  if (!isToolPart) return false;
  // A part with no state at all is not something we can vouch for either.
  return !part.state || !ANSWERED_STATES.has(part.state);
}

export function pruneUnansweredToolCalls(messages: UIMessage[]): UIMessage[] {
  const pruned: UIMessage[] = [];

  for (const message of messages) {
    if (!Array.isArray(message.parts)) {
      pruned.push(message);
      continue;
    }

    const parts = message.parts.filter((part) => !isUnansweredToolPart(part));
    if (parts.length === message.parts.length) {
      pruned.push(message);
      continue;
    }
    // An assistant message left with nothing in it is dropped rather than sent
    // empty — it carried only the abandoned call.
    if (parts.length > 0) pruned.push({ ...message, parts });
  }

  return pruned;
}
