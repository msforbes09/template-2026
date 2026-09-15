"use client";

// A safety net for closed questions the model asked in prose instead of
// through askUser.
//
// The system prompt tells it to use the tool, and it usually does — but
// "usually" leaves the user typing "yes" at a chat box, which is the exact
// friction the tool exists to remove. This reads the assistant's own trailing
// question and offers the obvious answers as buttons, so the fallback doesn't
// depend on the model having complied.
//
// Deliberately narrow: it only fires on a question it can answer confidently,
// and offers nothing otherwise. A wrong guess here would put misleading
// buttons under a question they don't fit, which is worse than no buttons.

// Openers that make a question closed in English. Matched on the final
// question in the message, since that's the one being asked.
const YES_NO_OPENERS =
  /^(do|does|did|are|is|was|were|am|would|will|shall|should|can|could|may|might|have|has|had)\b/i;

// "Would you like me to..." / "Want me to..." — phrasings that read as offers
// rather than grammatical yes/no questions.
const OFFER_PHRASES = /\b(would you like|do you want|want me to|shall i|should i|may i)\b/i;

// Splits "A or B?" into its alternatives when they're short enough to be
// buttons. Handles "Staging or production?" but declines anything long or
// clause-like, where the split would produce nonsense labels.
function alternatives(question: string): string[] | null {
  const body = question.replace(/\?+\s*$/, "").trim();
  // Strip a leading offer phrase so "Would you like A or B" splits cleanly.
  const stripped = body.replace(/^.*?\b(?:like|want|prefer)\b\s*/i, "");
  const parts = stripped.split(/\s+\bor\b\s+/i);
  if (parts.length !== 2) return null;

  const labels = parts.map((part) => part.replace(/^(the|a|an|to)\s+/i, "").trim());
  if (labels.some((label) => !label || label.length > 24 || label.split(/\s+/).length > 3)) {
    return null;
  }
  // Title-case the first letter so the buttons read as labels, not fragments.
  return labels.map((label) => label.charAt(0).toUpperCase() + label.slice(1));
}

export function quickReplyOptions(text: string): string[] | null {
  const trimmed = text.trim();
  if (!trimmed.endsWith("?")) return null;

  // The last question in the message is the one awaiting an answer.
  const questions = trimmed.match(/[^.!?]*\?/g);
  const question = questions?.at(-1)?.trim();
  if (!question || question.length > 200) return null;

  const either = alternatives(question);
  if (either) return either;

  if (YES_NO_OPENERS.test(question) || OFFER_PHRASES.test(question)) return ["Yes", "No"];
  return null;
}
