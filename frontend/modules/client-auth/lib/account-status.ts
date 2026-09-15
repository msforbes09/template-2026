import type { AccountStatus } from "@/modules/client-auth/lib/account";
import {
  accountStatus,
  isDeveloper,
  isSuspended,
  type Account,
} from "@/modules/client-auth/lib/account";

// What each lifecycle state means to the person in it, and what they do next.
// Kept apart from account.ts (which answers "may they?") because this answers
// "what should they read?" — different question, different consumers.

export type AccountStatusTone = "neutral" | "progress" | "action" | "good" | "frozen";

export type AccountStatusCopy = {
  label: string;
  tone: AccountStatusTone;
  // One sentence naming the state.
  summary: string;
  // What the person does next, or null when it is somebody else's move.
  nextStep: string | null;
};

const COPY: Record<AccountStatus, AccountStatusCopy> = {
  draft: {
    label: "Profile incomplete",
    tone: "action",
    summary: "Your profile isn't finished yet.",
    nextStep: "Complete it to start rating and reviewing projects.",
  },
  completed: {
    label: "Basic account",
    tone: "good",
    summary: "You can rate and review projects on the showcase.",
    // Assumes developer applications are open. Nothing renders this today —
    // `completed` gets AccountJourney on the dashboard, not AccountStatePanel,
    // and the journey gates its apply step on the `developer_applications` flag.
    // If this state ever comes back to the panel, gate it the same way (see
    // describeNextStep below, which does).
    nextStep: "Apply as a developer to get API credentials and enter your own projects.",
  },
  for_assessment: {
    label: "Application under review",
    tone: "progress",
    summary: "Your developer application is with the reviewers.",
    // Deliberately null: the citizen has nothing to do, and inventing a step
    // for them would only invite pointless resubmissions.
    nextStep: null,
  },
  for_resubmission: {
    label: "Changes requested",
    tone: "action",
    summary: "A reviewer sent your application back with remarks.",
    nextStep: "Address the remarks below, then submit your application again.",
  },
  approved: {
    label: "Developer account",
    tone: "good",
    summary: "You have API credentials and can enter projects into the showcase.",
    nextStep: null,
  },
  suspended: {
    label: "Account suspended",
    tone: "frozen",
    summary:
      "An administrator has suspended this account. You can still sign in and read your data, but not change anything.",
    nextStep: null,
  },
  pending: {
    label: "Awaiting activation",
    tone: "neutral",
    summary: "This account was created through eGovPH sign-in, which is paused.",
    nextStep: null,
  },
};

export function accountStatusCopy(account: Account): AccountStatusCopy | null {
  const status = accountStatus(account.status);
  if (!status) return null;
  // `approved` and `developer` normally travel together, but the axes are
  // independent — trust the type for the label a developer sees.
  if (status === "approved" && !isDeveloper(account)) {
    return { ...COPY.approved, label: "Approved" };
  }
  return COPY[status];
}

// ── Review history ────────────────────────────────────────────────────────
//
// `assessment_remarks` is the account's whole history, newest first, with
// each entry prefixed by a dated tag the backend writes:
//
//   [Returned 2026-08-21] the address doesn't match your ID
//   [Suspended 2026-08-19] repeated abuse reports
//
// Parsing it into entries lets the tag render as a badge, and — more usefully
// — lets the newest [Suspended …] line be pulled out as the suspension
// reason, which has no field of its own.

export type RemarkEntry = {
  tag: string | null;
  date: string | null;
  body: string;
};

const TAGGED_LINE = /^\[([A-Za-z]+)\s+(\d{4}-\d{2}-\d{2})\]\s*(.*)$/;

export function parseRemarks(remarks: string | null | undefined): RemarkEntry[] {
  if (!remarks?.trim()) return [];
  return remarks
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = TAGGED_LINE.exec(line);
      // An untagged line is still shown — older remarks predate the tagging,
      // and dropping them would silently lose history.
      if (!match) return { tag: null, date: null, body: line };
      return { tag: match[1], date: match[2], body: match[3] };
    });
}

// The reason an account is suspended, which is the newest [Suspended …] line
// rather than a field of its own.
export function suspensionReason(remarks: string | null | undefined): RemarkEntry | null {
  return parseRemarks(remarks).find((entry) => entry.tag === "Suspended") ?? null;
}

// What the account is told while developer applications are switched off —
// the same sentence for a completed account and a returned one, since neither
// can submit and the reason is identical. Deliberately does not invite them to
// come back and try: the backend refuses, and the announcement sent at the
// reset says the same thing.
const APPLICATIONS_CLOSED =
  "Developer applications are closed at the moment. Your account stays active — you can still rate, test and review projects on the showcase.";

// The single next thing that unlocks something, in plain words. Derived here
// rather than in each consumer so the dashboard, the placeholders and the chat
// assistant cannot drift into describing the same account differently.
//
// `applicationsOpen` is the `developer_applications` feature flag, which only
// the server can read — hence a parameter rather than an import, so this
// module stays pure and usable from a client component. It defaults to open,
// which is also the flag's default.
export function describeNextStep(
  account: Account,
  { applicationsOpen = true }: { applicationsOpen?: boolean } = {},
): string | null {
  if (isSuspended(account)) return null;

  const status = accountStatus(account.status);
  switch (status) {
    case "draft":
      return "Fill in your profile at /dashboard/profile/edit, then mark it complete to unlock rating and reviewing.";
    case "completed":
      return applicationsOpen
        ? "Apply as a developer from /dashboard to get API credentials and enter projects into the showcase."
        : APPLICATIONS_CLOSED;
    case "for_assessment":
      return null;
    case "for_resubmission":
      // The remarks are still worth addressing — the profile edit is not
      // gated — but resubmitting is refused while the switch is off, so
      // sending them to /dashboard to press a button that isn't there would
      // be the wrong instruction.
      return applicationsOpen
        ? "Address the reviewer's remarks on /dashboard, then submit your application again."
        : APPLICATIONS_CLOSED;
    case "approved":
      return null;
    default:
      return null;
  }
}
