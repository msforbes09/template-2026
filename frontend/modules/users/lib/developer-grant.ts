// Whether the admin console should offer the direct developer grant
// (POST /users/{uuid}/make-approved-developer, the 2026-08-31 handoff) on a
// row — the mirror of the existing demote, promoting a basic account straight
// to an approved developer with no application in between.
//
// The backend gates on ONE thing: the account must be `completed`. Everything
// else answers 400 `invalid_status` — an existing developer (`approved`), a
// bare `draft`, a queued `for_assessment`, a returned `for_resubmission`, and
// a `suspended` account alike.
//
// The `type` check is redundant against today's data (a developer's status is
// `approved`, never `completed`) and is kept anyway: the two axes are
// genuinely independent, and offering "Make developer" on an account that
// already is one would be a confusing control even if the API happened to
// accept it.
//
// Deliberately NOT gated on `developer_applications`. The grant is the
// admin lane, which stays open while citizen applications are switched off —
// that is most of the point of having it.
export function canGrantDeveloper(user: {
  status: string | null;
  type?: string | null;
}): boolean {
  return user.status === "completed" && user.type !== "developer";
}
