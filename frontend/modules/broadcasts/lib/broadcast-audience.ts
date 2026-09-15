import type { BroadcastFilters } from "@/types/broadcast";

// Saying the audience in words.
//
// This is the safety-critical part of the screen: an administrator is about to
// notify people who cannot un-receive it, and `{"status":"draft"}` is not
// something anyone should have to parse under time pressure. Every place the
// audience appears — the compose form's confirmation, the history table, the
// start dialog — reads it from here, so they cannot disagree about who a
// broadcast reaches.
//
// Pure, and tested, for the same reason.

// The user-facing wording for each account state, matching what the rest of
// the console calls them.
const STATUS_WORDS: Record<string, string> = {
  draft: "with an incomplete profile",
  completed: "with a completed profile",
};

export type BroadcastAudience = {
  // One line, e.g. "All users with a completed profile".
  label: string;
  // The one identifying value behind a narrow label — today the target's
  // uuid on a single-user broadcast, null for the broader audiences. The
  // API sends no name to resolve, so the uuid IS the scope record.
  detail: string | null;
  // True when this reaches every registered user — the one case worth an
  // extra confirmation step before sending.
  isEveryone: boolean;
  // True when it targets exactly one user.
  isSingleUser: boolean;
};

export function describeAudience(filters: BroadcastFilters): BroadcastAudience {
  // Null filters, and an object with nothing usable in it, both mean the same
  // thing: no targeting was applied.
  const userUuid = filters?.user_uuid?.trim();
  if (userUuid) {
    return { label: "One user", detail: userUuid, isEveryone: false, isSingleUser: true };
  }

  const status = filters?.status;
  if (!status) {
    return { label: "All registered users", detail: null, isEveryone: true, isSingleUser: false };
  }

  // An unrecognised value is spelled out rather than dropped: the audience
  // line must never understate who is being reached.
  const statusWords = STATUS_WORDS[status] ?? `with status ${status}`;
  return { label: `All users ${statusWords}`, detail: null, isEveryone: false, isSingleUser: false };
}

// Whether a fan-out has been running long enough to be worth flagging. Both
// timestamps are server wall-clock without an offset, so this compares
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
