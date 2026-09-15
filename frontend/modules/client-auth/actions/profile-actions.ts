"use server";

import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireClientSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import { isFeatureEnabled } from "@/modules/feature-flags/lib/get-feature-flags";
import type { ActionResult } from "@/lib/action-result";
import type { ClientUserProfile } from "@/types/client-user";
import type { ProfileValues } from "@/modules/client-auth/schemas/profile-schema";

function toActionResult(err: unknown, where: string): ActionResult<never> {
  if (isApiError(err)) {
    const safe =
      err.status >= 500 && env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message;
    // `code` carries the API's slug (profile_incomplete,
    // profile_change_cooldown, account_suspended), which is what callers
    // branch on — the HTTP status is shared by several distinct refusals.
    return { ok: false, status: err.status, message: safe, errors: err.errors, code: err.code, meta: err.meta };
  }
  void logError(err, { where, audience: "client" });
  return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
}

export async function updateClientProfile(
  values: ProfileValues,
): Promise<ActionResult<ClientUserProfile>> {
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: ClientUserProfile }>(
      "/profile",
      { method: "PUT", body: JSON.stringify(values) },
      "client",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "updateClientProfile action");
  }
}

// The message a citizen sees when applications are switched off. Word for word
// the backend's own copy, so a stale tab that reaches the API and one refused
// before it leaves here read the same sentence — which half said no is not the
// citizen's problem.
//
// Not exported: this module is "use server", where every export becomes a
// callable endpoint and only async functions are allowed.
const APPLICATIONS_CLOSED_MESSAGE = "Developer applications are currently closed.";

// Applying is gated by the `developer_applications` runtime flag (2026-09-02
// handoff). The UI half hides every "Apply as a developer" control
// — but a server action is a public HTTP endpoint whose id ships in the client
// bundle, so hiding the button does not stop a direct POST. Refusing here is
// what makes the frontend switch real rather than cosmetic (security.md rule
// 16), and it mirrors the backend's envelope exactly (400 `applications_closed`)
// so the caller cannot tell which half refused.
//
// The backend remains the authority: with only this half off the endpoint is
// still open, and with only the backend half off this returns nothing and the
// 400 comes back instead. Callers branch on `code`, so both look the same.
function applicationsClosed(): ActionResult<never> {
  return {
    ok: false,
    status: 400,
    message: APPLICATIONS_CLOSED_MESSAGE,
    errors: {},
    code: "applications_closed",
  };
}

export async function submitForAssessment(): Promise<ActionResult<ClientUserProfile>> {
  if (!(await isFeatureEnabled("developer_applications"))) return applicationsClosed();
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: ClientUserProfile }>(
      "/profile/submit-for-assessment",
      { method: "POST" },
      "client",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "submitForAssessment action");
  }
}

// POST /add-contact's 200 is a bare object (like /register's), not wrapped
// in `data` — unlike updateClientProfile/submitForAssessment above.
export async function addContact(input: {
  channel: "email" | "sms";
  email?: string;
  mobile_number?: string;
}): Promise<ActionResult<{ resend_token: string; retry_after: number }>> {
  await requireClientSession();
  try {
    const data = await apiFetch<{ resend_token: string; retry_after: number }>(
      "/profile/add-contact",
      {
        method: "POST",
        body: JSON.stringify({
          channel: input.channel,
          email: input.channel === "email" ? input.email : undefined,
          mobile_number: input.channel === "sms" ? input.mobile_number : undefined,
        }),
      },
      "client",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "addContact action");
  }
}

export type VerifyContactResult =
  | { ok: true; data: ClientUserProfile }
  | {
      ok: false;
      status: number;
      message: string;
      errors: Record<string, string[]>;
      remainingAttempts?: number;
    };

// A bespoke result shape (not the shared ActionResult/toActionResult above)
// so a wrong-OTP 400's meta.remaining_attempts survives — every other
// OTP-verify screen in this app already surfaces this and the confirmed
// contract documents it here too; ApiError.meta already carries it, only
// toActionResult's narrow mapping would drop it.
function toVerifyContactResult(err: unknown, where: string): VerifyContactResult {
  if (isApiError(err)) {
    const safe =
      err.status >= 500 && env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message;
    const remainingAttempts =
      err.meta?.remaining_attempts !== undefined ? Number(err.meta.remaining_attempts) : undefined;
    return { ok: false, status: err.status, message: safe, errors: err.errors, remainingAttempts };
  }
  void logError(err, { where, audience: "client" });
  return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
}

export async function verifyContact(input: {
  channel: "email" | "sms";
  email?: string;
  mobile_number?: string;
  otp: string;
}): Promise<VerifyContactResult> {
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: ClientUserProfile }>(
      "/profile/verify-contact",
      {
        method: "POST",
        body: JSON.stringify({
          channel: input.channel,
          email: input.channel === "email" ? input.email : undefined,
          mobile_number: input.channel === "sms" ? input.mobile_number : undefined,
          otp: input.otp,
        }),
      },
      "client",
    );
    return { ok: true, data };
  } catch (err) {
    return toVerifyContactResult(err, "verifyContact action");
  }
}


// POST /profile/complete — marks the profile complete, which unlocks
// reviewing and STARTS both 30-day edit-cooldown clocks. Refuses with
// 400 profile_incomplete and a meta.missing[] list naming the empty fields.
export async function completeProfile(): Promise<ActionResult<ClientUserProfile>> {
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: ClientUserProfile }>(
      "/profile/complete",
      { method: "POST" },
      "client",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "completeProfile action");
  }
}

// PATCH /profile/photo — the photo has its own endpoint and its own cooldown
// clock; `photo_uuid` is ignored by PUT /profile. Setting a photo when none
// is attached is always allowed, even inside a cooldown window.
export async function updateProfilePhoto(
  photoUuid: string,
): Promise<ActionResult<ClientUserProfile>> {
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: ClientUserProfile }>(
      "/profile/photo",
      { method: "PATCH", body: JSON.stringify({ photo_uuid: photoUuid }) },
      "client",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "updateProfilePhoto action");
  }
}
