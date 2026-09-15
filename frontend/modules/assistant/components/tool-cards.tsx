"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  TestRequestCard,
  type TestRequestResult,
} from "@/modules/assistant/components/test-request-card";
import {
  CredentialActionCard,
  type CredentialActionResult,
} from "@/modules/assistant/components/credential-action-card";
import {
  PrepareTestCard,
  type PrepareTestResult,
} from "@/modules/assistant/components/prepare-test-card";
import {
  CatalogVariablesCard,
  type CatalogVariablesResult,
} from "@/modules/assistant/components/catalog-variables-card";
import {
  ChooseTestTargetCard,
  type ChooseTestTargetResult,
} from "@/modules/assistant/components/choose-test-target-card";
import { CatalogListCard } from "@/modules/assistant/components/catalog-list-card";
import { SignInCard } from "@/modules/assistant/components/sign-in-card";
import { AskUserCard, type AskUserResult } from "@/modules/assistant/components/ask-user-card";
import {
  parseAskUser,
  parseCanTest,
  parseCatalogList,
  parseChooseTestTarget,
  parseCredentialInput,
  parseIdentifier,
  parseSignInPrompt,
  parseTestInput,
} from "@/modules/assistant/lib/tool-output";

// One entry per tool that renders something. Adding a tool means adding one
// entry here — nothing else.
//
// This replaced a switch in AssistantChat where each tool needed three separate
// edits: a branch, an exclusion in the read-only fallback's condition, and a
// membership in the interactive set. Nothing checked that the three agreed, so
// a tool could render its card while still being treated as read-only. Now the
// fallback is "not in this map" and the interactive set is derived from it, so
// they can't disagree.

// The SDK's part union is regenerated from the toolset, and every card already
// re-validates `input`/`output` as unknown (they're model-generated), so the
// generated types buy nothing here. This is the shape the loop actually uses.
export type ToolPart = {
  type: string;
  toolCallId: string;
  state: "input-streaming" | "input-available" | "output-available" | "output-error";
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

export function asToolPart(part: { type: string }): ToolPart | null {
  if (!part.type.startsWith("tool-")) return null;
  const candidate = part as Partial<ToolPart> & { type: string };
  return typeof candidate.state === "string" && typeof candidate.toolCallId === "string"
    ? (candidate as ToolPart)
    : null;
}

export function ToolActivity({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 aria-hidden className="size-3 animate-spin" />
      {label}
    </p>
  );
}

export type ToolCardContext = {
  part: ToolPart;
  // Returns a client-side tool's result to the model, resuming the turn.
  addToolOutput: (args: { tool: string; toolCallId: string; output: unknown }) => void;
  // Sends a new user message — for cards that hand a choice back as a normal
  // request rather than as tool output.
  submit: (text: string) => void;
};

type ToolCard = {
  // Whether this card gives the user something to click. Drives the fallback
  // quick-reply chips: if a card is already on screen, a second set of buttons
  // underneath it is noise.
  interactive: boolean;
  render: (ctx: ToolCardContext) => ReactNode;
};

// Both states, deliberately, for every action card: submitting a result flips
// input-available to output-available, and a card that stopped rendering there
// would vanish at the moment it mattered — taking a generated credential's
// one-and-only view of its secret with it.
function isLive(part: ToolPart): boolean {
  return part.state === "input-available" || part.state === "output-available";
}

export const TOOL_CARDS: Record<string, ToolCard> = {
  "tool-testApiCatalogEndpoint": {
    interactive: true,
    render: ({ part, addToolOutput }) => {
      if (part.state === "input-streaming") return <ToolActivity label="Preparing a test request…" />;
      if (!isLive(part)) return null;
      const proposal = parseTestInput(part.input);
      if (!proposal) return null;
      return (
        <TestRequestCard
          identifier={proposal.identifier}
          requestName={proposal.requestName}
          onResult={(result: TestRequestResult) =>
            // No await — awaiting inside the callback risks a deadlock with the
            // automatic resume.
            addToolOutput({
              tool: "testApiCatalogEndpoint",
              toolCallId: part.toolCallId,
              output: result,
            })
          }
        />
      );
    },
  },

  "tool-askUser": {
    interactive: true,
    render: ({ part, addToolOutput }) => {
      if (!isLive(part)) return null;
      const ask = parseAskUser(part.input);
      // Unusable options: render nothing and let the model's prose stand,
      // rather than a question with no way to answer it.
      if (!ask) return null;
      return (
        <AskUserCard
          question={ask.question}
          options={ask.options}
          onResult={(result: AskUserResult) =>
            addToolOutput({ tool: "askUser", toolCallId: part.toolCallId, output: result })
          }
        />
      );
    },
  },

  // The one read-only result worth rendering rather than summarising: it's a
  // menu, and a menu should be clickable.
  //
  // Only showApiCatalogs renders. listApiCatalogs returns the same data but is
  // the model's own lookup — it has no entry here, so it shows the generic
  // "looking that up" and then nothing. That split is what stopped a menu of
  // every API appearing under answers about one the user had already named.
  "tool-showApiCatalogs": {
    interactive: true,
    render: ({ part, submit }) => {
      if (part.state === "input-streaming" || part.state === "input-available") {
        return <ToolActivity label="Loading APIs…" />;
      }
      if (part.state !== "output-available") return null;
      const canTest = parseCanTest(part.output);
      return (
        <CatalogListCard
          catalogs={parseCatalogList(part.output)}
          canTest={canTest}
          onPick={(catalog) =>
            // Handed back as a normal request so the testing order runs from
            // step 0, instead of jumping the queue. Signed out that order
            // doesn't exist, so the button asks for what it can actually get.
            submit(
              canTest
                ? `Test the ${catalog.name ?? catalog.identifier} API`
                : `Show me the documentation for the ${catalog.name ?? catalog.identifier} API`,
            )
          }
        />
      );
    },
  },

  // Server-executed, so it lands straight on output-available and the model
  // keeps talking — an affordance beside the answer, not a gate in front of it.
  "tool-promptSignIn": {
    interactive: true,
    render: ({ part }) => {
      if (part.state !== "output-available") return null;
      const prompt = parseSignInPrompt(part.output);
      if (!prompt) return null;
      return <SignInCard reason={prompt.reason} />;
    },
  },

  "tool-chooseTestTarget": {
    interactive: true,
    render: ({ part, addToolOutput }) => {
      if (part.state === "input-streaming") return <ToolActivity label="Loading APIs…" />;
      if (!isLive(part)) return null;
      const { identifier, justTested } = parseChooseTestTarget(part.input);
      return (
        <ChooseTestTargetCard
          initialIdentifier={identifier}
          justTested={justTested}
          onResult={(result: ChooseTestTargetResult) =>
            addToolOutput({ tool: "chooseTestTarget", toolCallId: part.toolCallId, output: result })
          }
        />
      );
    },
  },

  "tool-manageCatalogVariables": {
    interactive: true,
    render: ({ part, addToolOutput }) => {
      if (part.state === "input-streaming") return <ToolActivity label="Opening test variables…" />;
      if (!isLive(part)) return null;
      const identifier = parseIdentifier(part.input);
      if (!identifier) return null;
      return (
        <CatalogVariablesCard
          identifier={identifier}
          onResult={(result: CatalogVariablesResult) =>
            addToolOutput({
              tool: "manageCatalogVariables",
              toolCallId: part.toolCallId,
              output: result,
            })
          }
        />
      );
    },
  },

  "tool-prepareCatalogTest": {
    interactive: true,
    render: ({ part, addToolOutput }) => {
      if (part.state === "input-streaming") return <ToolActivity label="Checking prerequisites…" />;
      if (!isLive(part)) return null;
      const identifier = parseIdentifier(part.input);
      if (!identifier) return null;
      return (
        <PrepareTestCard
          identifier={identifier}
          onResult={(result: PrepareTestResult) =>
            addToolOutput({
              tool: "prepareCatalogTest",
              toolCallId: part.toolCallId,
              output: result,
            })
          }
        />
      );
    },
  },

  "tool-manageApiCatalogCredential": {
    interactive: true,
    render: ({ part, addToolOutput }) => {
      if (part.state === "input-streaming") return <ToolActivity label="Preparing…" />;
      if (!isLive(part)) return null;
      const proposal = parseCredentialInput(part.input);
      if (!proposal) return null;
      return (
        <CredentialActionCard
          identifier={proposal.identifier}
          action={proposal.action}
          onResult={(result: CredentialActionResult) =>
            // Carries no secret by construction — see the invariant at the top
            // of CredentialActionCard.
            addToolOutput({
              tool: "manageApiCatalogCredential",
              toolCallId: part.toolCallId,
              output: result,
            })
          }
        />
      );
    },
  },
};

// Derived, not maintained: a card that renders buttons is interactive by
// definition, so this can't fall out of step with the map above.
export const INTERACTIVE_TOOL_PARTS = new Set(
  Object.entries(TOOL_CARDS)
    .filter(([, card]) => card.interactive)
    .map(([type]) => type),
);
