// Claim-gated row actions (approve, return, suspend, release) only work for
// the admin who started the assessment — the API answers 403
// assessment_not_owned for anyone else, so the table hides them up front.
//
// Fails open on missing data: an absent assessment_started_by_id (WS not yet
// deployed) or an unknown signed-in admin keeps today's behavior — actions
// visible, with the server still enforcing ownership.
export function isClaimedByOtherAdmin(
  user: { is_assessment_started: 0 | 1; assessment_started_by_id?: number | null },
  currentAdminId: number | null,
): boolean {
  return (
    user.is_assessment_started === 1 &&
    user.assessment_started_by_id != null &&
    currentAdminId != null &&
    user.assessment_started_by_id !== currentAdminId
  );
}

// The claim from this admin's seat, driving the row's adaptive button:
// `unclaimed` (the click claims, then opens the details), `mine` (continue),
// `other` (look, but the lifecycle is theirs). Same fail-open reading as
// isClaimedByOtherAdmin: a claim with missing attribution counts as mine —
// actions stay reachable and the server still enforces ownership.
export type ClaimState = "unclaimed" | "mine" | "other";

export function claimState(
  user: { is_assessment_started: 0 | 1; assessment_started_by_id?: number | null },
  currentAdminId: number | null,
): ClaimState {
  if (user.is_assessment_started !== 1) return "unclaimed";
  return isClaimedByOtherAdmin(user, currentAdminId) ? "other" : "mine";
}
