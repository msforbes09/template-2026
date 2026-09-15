// What the session writers answer with.
//
// A discriminated result rather than a thrown error or a bare void: these are
// awaited inside client form handlers that have no try/catch, so a throw would
// surface as an unhandled rejection and a void return would let a failed
// verification fall straight through to router.push() — signed out, but on the
// dashboard. The caller has to look at `ok` to get past it.
export type WriteSessionResult = { ok: true } | { ok: false; message: string };
