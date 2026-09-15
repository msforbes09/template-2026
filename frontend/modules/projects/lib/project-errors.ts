import { isApiError } from "@/lib/api-error";

// Every "show one project" endpoint is documented to answer 404 for a uuid it
// can't resolve. The deployed API doesn't: GET common/projects/{uuid} answers
// **400 `data_processing_failed`** for an unknown uuid and for a malformed
// one alike (verified against https://egov-api-ws.oueg.info on 2026-08-20 —
// both `does-not-exist` and a well-formed but unused uuid come back 400).
//
// Left unhandled that turns every stale or mistyped project link into a
// server-error page instead of a clean 404, so both shapes are treated as
// "no such project" here. The 400 arm is a deliberate accommodation of a
// backend that doesn't match its own spec: when the API starts returning 404,
// this can drop back to a plain status check with no behaviour change.
//
// Deliberately narrow — only this error code, and only ever applied to a
// read of one project by uuid, so a genuine processing failure elsewhere
// still surfaces as an error.
export function isMissingProjectError(err: unknown): boolean {
  if (!isApiError(err)) return false;
  if (err.status === 404) return true;
  return err.status === 400 && err.code === "data_processing_failed";
}
