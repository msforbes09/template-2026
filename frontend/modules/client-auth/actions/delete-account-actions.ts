"use server";

import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireClientSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import type { DeleteAccountValues } from "@/modules/client-auth/schemas/delete-account-schema";
import { clearClientSessionCookie } from "@/modules/client-auth/actions/session-actions";

function toActionResult(err: unknown, where: string): ActionResult<never> {
  if (isApiError(err)) {
    // The endpoint is throttled at 5/min per account. Laravel's own 429 body is
    // usually empty or terse, so say something the user can act on rather than
    // passing through "Too Many Attempts."
    if (err.status === 429) {
      return {
        ok: false,
        status: 429,
        message: "Too many attempts. Wait a minute and try again.",
        errors: {},
      };
    }
    const safe =
      err.status >= 500 && env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message;
    return { ok: false, status: err.status, message: safe, errors: err.errors };
  }
  void logError(err, { where, audience: "client" });
  return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
}

// DELETE /user/profile — self-service account deletion.
//
// A soft delete: the backend keeps a minimal record for audit and revokes every
// token the account holds, so the user is logged out everywhere the moment
// this returns. The local Better Auth session is therefore dropped here rather
// than left for the caller — if it survived, the next request would carry a
// token the backend has already killed and 401, which reads as a bug rather
// than as "your account is gone".
//
// Dropped WITHOUT calling /logout (see clearClientSessionCookie): there is no
// live token left to revoke.
//
// The password in `values` is the re-authentication. It is forwarded and never
// stored, and a wrong one comes back as a 422 on the `password` field.
export async function deleteClientAccount(
  values: DeleteAccountValues,
): Promise<ActionResult<null>> {
  await requireClientSession();
  try {
    await apiFetch("/profile", { method: "DELETE", body: JSON.stringify(values) }, "client");
  } catch (err) {
    return toActionResult(err, "deleteClientAccount action");
  }

  // Outside the try: a failure to clear the local cookie must not be reported
  // as a failed deletion, because by this point the account is already gone.
  try {
    await clearClientSessionCookie();
  } catch (err) {
    void logError(err, { where: "deleteClientAccount -> clearClientSessionCookie", audience: "client" });
  }

  return { ok: true, data: null };
}
