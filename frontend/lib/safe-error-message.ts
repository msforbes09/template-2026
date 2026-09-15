import { isApiError } from "@/lib/api-error";
import { env } from "@/lib/env";

// The one place that decides how much of an upstream failure a caller may see.
//
// ApiError.message is upstream content — lib/api-error.ts builds it from
// `body.message ?? res.statusText`, i.e. whatever Laravel put in the non-2xx
// body: framework exception text, SQL fragments, file paths, internal
// hostnames on a connection fault. Every server action already gated it behind
// `status >= 500 && production`, but route handlers, public Server Components
// and the assistant tools forwarded it verbatim, for every status, in every
// environment — so an anonymous visitor to /privacy-policy could be shown
// backend internals inside an EmptyState, and the same string is treated as
// operator-only when logError ships it to Slack.
//
// The rule, unchanged from the server actions — this only makes it shared:
//
//   - 4xx passes through. A 422's validation text and a 404's "not found" are
//     written for the user and are the whole value of the message.
//   - 5xx is masked in production. Nothing in a server fault is meant for a
//     visitor, and it is the class that carries internals.
//   - A non-API error (network, parse, thrown string) never passes through:
//     its message is not upstream content and has no user-facing contract.
//
// Development shows everything, which is what makes a failing page debuggable.
export const GENERIC_MESSAGE = "Something went wrong. Please try again.";

export function safeErrorMessage(err: unknown, fallback: string = GENERIC_MESSAGE): string {
  if (!isApiError(err)) return fallback;
  if (err.status >= 500 && env.NODE_ENV === "production") return GENERIC_MESSAGE;
  return err.message;
}
