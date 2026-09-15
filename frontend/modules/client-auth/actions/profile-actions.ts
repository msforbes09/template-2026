"use server";

import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireClientSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
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

// POST /add-contact's 200 is a bare object (like /register's), not wrapped
// in `data` — unlike updateClientProfile above.
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
