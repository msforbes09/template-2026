import { accountStatus, type Account, type AccountStatus } from "@/modules/client-auth/lib/account";

// What each lifecycle state means to the person in it, and what they do next.
// Kept apart from account.ts (which answers "may they?") because this answers
// "what should they read?" — different question, different consumers.

export type AccountStatusTone = "neutral" | "progress" | "action" | "good" | "frozen";

export type AccountStatusCopy = {
  label: string;
  tone: AccountStatusTone;
  // One sentence naming the state.
  summary: string;
  // What the person does next, or null when there is nothing to do.
  nextStep: string | null;
};

const COPY: Record<AccountStatus, AccountStatusCopy> = {
  draft: {
    label: "Profile incomplete",
    tone: "action",
    summary: "Your profile isn't finished yet.",
    nextStep: "Complete it to finish setting up your account.",
  },
  completed: {
    label: "Account ready",
    tone: "good",
    summary: "Your profile is complete.",
    nextStep: null,
  },
};

export function accountStatusCopy(account: Account): AccountStatusCopy | null {
  const status = accountStatus(account.status);
  if (!status) return null;
  return COPY[status];
}
