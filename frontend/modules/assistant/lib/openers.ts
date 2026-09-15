import { parseAssistantPathname } from "@/modules/assistant/lib/page-context";

// What the assistant says before anyone has typed anything.
//
// Two audiences, two different conversations. Signed out, the useful questions
// are about getting in — what the portal is, how to register, how to sign in
// with an account you already have — plus the parts that need no account at
// all (the catalog, the FAQs). Signed in, none of that is interesting any
// more: the questions become testing an endpoint, minting a credential for an
// API, and reading your own credits and account.
//
// Kept out of the component and free of JSX so the copy is one testable
// function rather than two branches of markup.

export type AssistantOpener = {
  // First person, because the panel is a chat and the alternative reads like a
  // form's help text.
  intro: string;
  // What it can be asked about. Deliberately phrased as subjects, not as
  // questions — the buttons underneath are the questions.
  topics: string[];
  // Openers the user can click instead of typing. The last one in each list is
  // the one people otherwise ask in the clumsiest way.
  suggestions: string[];
};

const SIGNED_OUT: AssistantOpener = {
  intro:
    "Hi — I'm the portal assistant. I can help you get started with the eGov API Developer Portal, and answer anything about the APIs themselves without you signing in.",
  topics: [
    "Getting started — what the portal is and what you need before you can call an API",
    "Registering, completing your profile, and applying for developer access",
    "Signing in when you already have an account",
    "The API catalog — what's available and what each endpoint expects",
    "The project showcase — what people have built on these APIs",
    "FAQs and how the portal works",
  ],
  suggestions: [
    "How do I get started?",
    "How do I become a developer?",
    "I already have an account — how do I sign in?",
    "What have people built with these APIs?",
    "What APIs are available?",
  ],
};

const SIGNED_IN: AssistantOpener = {
  intro:
    "Hi — I'm the portal assistant. I read the live API catalog and your own account, so I can take you from picking an API to a working call.",
  topics: [
    "The API catalog — what each endpoint expects and returns",
    "Testing an endpoint end to end, right here in the chat",
    "Generating or revoking your credential for a specific API",
    "How many usage credits you have left",
    "Your account — who you're signed in as, what it can do now, and what unlocks the rest",
    "Your project entries and where each one is in review",
  ],
  suggestions: [
    "What APIs are available?",
    "Help me test an endpoint",
    "What can my account do?",
    "How are my projects doing?",
    "How many credits do I have left?",
  ],
};

// Openers that match the page. The defaults above are right on the home page
// and slightly absurd on top of an API's documentation, where the obvious
// questions are about that API.
function suggestionsFor(pathname: string, signedIn: boolean): string[] | null {
  const context = parseAssistantPathname(pathname);
  switch (context.kind) {
    case "catalog":
      // No name here — the client only has the identifier, and the server is
      // the one that knows the catalog. Phrased so it works either way.
      return signedIn
        ? [
            "What endpoints does this API have?",
            "Help me test this API",
            "Do I have credentials for this API?",
            "How do I authenticate with it?",
          ]
        : [
            "How do I authenticate with this API?",
            "What endpoints does it have?",
            "Show me an example request",
            "What do I need to start using it?",
          ];
    case "usage":
      return [
        "Why are my calls failing?",
        "Summarise my recent usage",
        "How many credits do I have left?",
      ];
    case "projects":
      return signedIn
        ? [
            "How are my projects doing?",
            "Why isn't my project showing publicly?",
            "How do I enter a project?",
            "What's in the TOP 30?",
          ]
        : [
            "What have people built with these APIs?",
            "What's in the TOP 30?",
            "How do I enter my own project?",
            "How are entries judged?",
          ];
    // Profile and dashboard are account pages; the signed-in defaults are
    // already the right questions there.
    default:
      return null;
  }
}

export function assistantOpener(pathname: string, signedIn: boolean): AssistantOpener {
  const base = signedIn ? SIGNED_IN : SIGNED_OUT;
  const suggestions = suggestionsFor(pathname, signedIn);
  return suggestions ? { ...base, suggestions } : base;
}
