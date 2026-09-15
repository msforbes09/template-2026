import "server-only";
import { env } from "@/lib/env";
import { redact, redactText } from "@/lib/redact";

const isDev = env.NODE_ENV !== "production";

type ErrorContext = {
  where: string;
  audience?: string;
  status?: number;
  extra?: Record<string, unknown>;
};

// Caps on what reaches the webhook. A log line is a diagnostic, not a dump:
// unbounded values here are both a Slack payload-size risk and the lever that
// makes reportError() a flooding primitive.
const MAX_MESSAGE = 1_500;
const MAX_STACK = 2_500;
const MAX_WHERE = 120;

function clamp(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…[truncated]` : value;
}

// Slack mrkdwn is markup, and every string below is interpolated into it —
// `where` and `message` can both originate from an unauthenticated caller via
// lib/report-error.ts. Without this, a message containing ``` closes the fence
// and continues in raw Slack markup: clickable links, <!channel> broadcasts,
// and text impersonating another subsystem, all inside the trusted incident
// channel. Escaping the three characters Slack treats as control (& < >) stops
// the link/mention forms; neutralising the backtick run stops the fence break.
function slackSafe(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/```/g, "`​`​`");
}

export async function logError(error: unknown, ctx: ErrorContext) {
  // Redacted before either branch: dev prints to a terminal that is often a
  // shared container log, so "it's only dev" is not a reason to leak a Bearer.
  const rawMessage = error instanceof Error ? error.message : String(error);
  const message = redactText(rawMessage);
  const stack = error instanceof Error && error.stack ? redactText(error.stack) : undefined;
  const where = clamp(ctx.where, MAX_WHERE);
  // `extra` was accepted by this signature and then never read — callers have
  // been passing context that went nowhere. It is now reported, which is
  // exactly why it has to go through the key scrubber first.
  const extra = ctx.extra ? (redact(ctx.extra) as Record<string, unknown>) : undefined;

  if (isDev) {
    console.error(`[${where}]`, message, stack ?? "", extra ?? "");
    return;
  }

  const url = env.SLACK_ERROR_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `eGov API error: ${slackSafe(where)}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${slackSafe(where)}*\n\`\`\`${slackSafe(clamp(message, MAX_MESSAGE))}\`\`\``,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `status: ${ctx.status ?? "n/a"} | audience: ${slackSafe(ctx.audience ?? "n/a")} | ${new Date().toISOString()}`,
              },
            ],
          },
          ...(extra && Object.keys(extra).length > 0
            ? [
                {
                  type: "context",
                  elements: [
                    {
                      type: "mrkdwn",
                      text: slackSafe(clamp(JSON.stringify(extra), MAX_MESSAGE)),
                    },
                  ],
                },
              ]
            : []),
          ...(stack
            ? [
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `\`\`\`${slackSafe(clamp(stack, MAX_STACK))}\`\`\``,
                  },
                },
              ]
            : []),
        ],
      }),
    });
  } catch {
    // logging must never break the user's request
  }
}
