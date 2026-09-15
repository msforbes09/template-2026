import type { BroadcastFilters } from "@/types/broadcast";
import type { AccountStatus } from "@/modules/client-auth/lib/account";

// Saying the audience in words.
//
// This is the safety-critical part of the screen: an administrator is about to
// notify people who cannot un-receive it, and `{"type":"developer"}` is not
// something anyone should have to parse under time pressure. Every place the
// audience appears — the compose form's confirmation, the history table, the
// start dialog — reads it from here, so they cannot disagree about who a
// broadcast reaches.
//
// Pure, and tested, for the same reason.

const TYPE_WORDS: Record<string, string> = {
  basic: "basic accounts",
  developer: "developer accounts",
};

// The citizen-facing wording for each account state, matching what the rest of
// the console calls them.
const STATUS_WORDS: Record<AccountStatus, string> = {
  draft: "with an incomplete profile",
  completed: "with a completed profile",
  for_assessment: "awaiting developer review",
  for_resubmission: "whose application was sent back",
  approved: "who are approved developers",
  suspended: "who are suspended",
  pending: "with a dormant SSO account",
};

export type BroadcastAudience = {
  // One line, e.g. "All developer accounts who are suspended".
  label: string;
  // The one identifying value behind a narrow label — today the target's
  // uuid on a single-citizen broadcast, null for the broader audiences. The
  // API sends no name to resolve, so the uuid IS the scope record.
  detail: string | null;
  // True when this reaches every registered user — the one case worth an
  // extra confirmation step before sending.
  isEveryone: boolean;
  // True when it targets exactly one citizen.
  isSingleUser: boolean;
  // Suspended citizens are READ-ONLY. They can read an announcement but
  // cannot act on anything it asks them to do, which is worth saying next to
  // a campaign aimed at them.
  includesSuspendedOnly: boolean;
};

export function describeAudience(filters: BroadcastFilters): BroadcastAudience {
  // Null filters, and an object with nothing usable in it, both mean the same
  // thing: no targeting was applied.
  const userUuid = filters?.user_uuid?.trim();
  if (userUuid) {
    return {
      label: "One citizen",
      detail: userUuid,
      isEveryone: false,
      isSingleUser: true,
      includesSuspendedOnly: false,
    };
  }

  const type = filters?.type;
  const status = filters?.status;

  if (!type && !status) {
    return {
      label: "All registered users",
      detail: null,
      isEveryone: true,
      isSingleUser: false,
      includesSuspendedOnly: false,
    };
  }

  const typeWords = type ? (TYPE_WORDS[type] ?? `${type} accounts`) : "users";
  const statusWords = status ? (STATUS_WORDS[status] ?? `with status ${status}`) : null;

  return {
    label: statusWords ? `All ${typeWords} ${statusWords}` : `All ${typeWords}`,
    detail: null,
    isEveryone: false,
    isSingleUser: false,
    includesSuspendedOnly: status === "suspended",
  };
}

// Whether a fan-out has been running long enough to be worth flagging. Both
// timestamps are Asia/Manila wall-clock without an offset, so this compares
// naive-to-naive: parsing `started_at` as local time and measuring against a
// local `now` keeps the arithmetic honest wherever the server runs.
export function isBroadcastStuck(
  startedAt: string | null,
  status: string,
  nowMs: number,
  thresholdMs: number,
): boolean {
  if (status !== "sending" || !startedAt) return false;
  const started = Date.parse(startedAt.replace(" ", "T"));
  if (Number.isNaN(started)) return false;
  return nowMs - started > thresholdMs;
}
