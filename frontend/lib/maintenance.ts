import { isApiError } from "@/lib/api-error";

// The backend's maintenance envelope (2026-09-02 handoff):
//
//   HTTP 503
//   { "error": "service_unavailable", "message": "The service is temporarily
//     down for maintenance. Please try again later." }
//
// This is the SECOND of the two signals the handoff asks for. The first is the
// `maintenance_mode` feature flag, read on load; this one catches the session
// that was already open when the flag flipped, and it needs no successful read
// of anything to work — which is what makes it the reliable half.
//
// Matched on the `error` slug rather than the status alone: a bare 503 can also
// come from a proxy or a cold container, and calling that "planned maintenance"
// would put a reassuring page in front of a real outage.
export function isMaintenanceError(err: unknown): boolean {
  return isApiError(err) && err.status === 503 && err.code === "service_unavailable";
}

// What every surface says while maintenance is on. One sentence, in one place,
// so the user portal, the public site and the admin login form cannot drift
// into describing the same outage three different ways.
export const MAINTENANCE_TITLE = "We're down for maintenance";

export const MAINTENANCE_MESSAGE =
  "The service is temporarily unavailable while we carry out scheduled maintenance. Nothing you have saved is affected, and everything will be here when we're back.";

// Deliberately no "try again at HH:MM": the backend does not tell us when it
// expects to be finished, and inventing a time is worse than not giving one.
export const MAINTENANCE_HINT = "Please check back shortly.";
