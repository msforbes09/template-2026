"use server";

import { revalidateTag } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import type { AdminUser } from "@/types/admin-user";

// A lifecycle change alters both the list row and the user's own record.
function revalidateUsers(uuid: string) {
  revalidateTag("users", "max");
  revalidateTag(`users:${uuid}`, "max");
}

function toActionResult(err: unknown, where: string): ActionResult<never> {
  if (isApiError(err)) {
    const safe =
      err.status >= 500 && env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message;
    // `code` distinguishes assessment_not_owned from invalid_status, which
    // share a shape but mean completely different things to the assessor.
    return { ok: false, status: err.status, message: safe, errors: err.errors, code: err.code, meta: err.meta };
  }
  // logError is fire-and-forget here since this helper isn't async
  void logError(err, { where, audience: "admin" });
  return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
}

export async function getUser(uuid: string): Promise<ActionResult<AdminUser>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminUser }>(
      `/users/${uuid}`,
      { next: { tags: [`users:${uuid}`] } },
      "admin",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "getUser action");
  }
}

// Claims the citizen's assessment if unclaimed, releases it if the current
// admin owns it — see the /toggle-assessment endpoint's doc. Only valid
// while status is "for_assessment"; approve/return both require the caller
// to have claimed it first (400 invalid_status / 403 assessment_not_owned
// otherwise, surfaced via toActionResult's message as-is).
// `transfer` is the retry flag for the one-claim-per-admin rule: a plain
// claim while holding another fails 400 assessment_already_in_progress (the
// held user in meta — see claimConflict); resending with transfer releases
// the caller's own claim and claims this user atomically. It never releases
// another admin's claim.
export async function toggleUserAssessment(
  uuid: string,
  transfer = false,
): Promise<ActionResult<AdminUser>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminUser }>(
      `/users/${uuid}/toggle-assessment`,
      { method: "POST", ...(transfer ? { body: JSON.stringify({ transfer: true }) } : {}) },
      "admin",
    );
    revalidateTag("users", "max");
    revalidateTag(`users:${uuid}`, "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "toggleUserAssessment action");
  }
}

// Sets the user to "approved". Requires the caller to already own this
// user's assessment (see toggleUserAssessment).
export async function approveUser(uuid: string): Promise<ActionResult<AdminUser>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminUser }>(
      `/users/${uuid}/approve`,
      { method: "POST" },
      "admin",
    );
    revalidateTag("users", "max");
    revalidateTag(`users:${uuid}`, "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "approveUser action");
  }
}

// Grants developer access DIRECTLY, with no application in between: a
// `completed` basic account becomes an `approved` developer (2026-08-31
// handoff). Same server-side effects as a normal approval — type flips to
// developer, approved_at/by are stamped, the claim is cleared, credential
// minting unlocks and the citizen gets the standard approval notification
// (email else SMS, plus the in-app application.approved) — so there is
// nothing extra to render here.
//
// Claim-owned like the sanctions: toggleUserAssessment first, or the API
// answers 403 assessment_not_owned. 400 invalid_status for anything that is
// not `completed`, which includes an account that is already a developer.
//
// Works even while citizen-side developer applications are switched off
// (the `developer_applications` feature flag) — the admin lane is
// deliberately not gated by that switch, and this action is how access is
// granted while it is shut. Do NOT add a check for it here.
export async function makeApprovedDeveloper(uuid: string): Promise<ActionResult<AdminUser>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminUser }>(
      `/users/${uuid}/make-approved-developer`,
      { method: "POST" },
      "admin",
    );
    revalidateUsers(uuid);
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "makeApprovedDeveloper action");
  }
}

// Tops up ONE of the citizen's per-catalog gateway pools (one pool per API
// catalog since 2026-08-24, so `platform` names which). `amount` is a positive
// multiple of 100, but its meaning depends on that pool's period:
//
//   - lifetime pool → ADDED to the allowance (the old behaviour);
//   - daily pool    → SETS the daily allowance, and may not be lower than the
//                     current one — 400 `allowance_cannot_be_lowered` with the
//                     current value in `meta.allowance`.
//
// An unknown platform slug is a 422. Requires `users-view` +
// `users-gateway-quota`; 403 without the latter. 400 `invalid_status` if the
// user is not an approved developer. Returns the full user, credits list
// included.
export async function bumpGatewayQuota(
  uuid: string,
  platform: string,
  amount: number,
): Promise<ActionResult<AdminUser>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminUser }>(
      `/users/${uuid}/gateway-quota`,
      { method: "PATCH", body: JSON.stringify({ platform, amount }) },
      "admin",
    );
    revalidateTag("users", "max");
    revalidateTag(`users:${uuid}`, "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "bumpGatewayQuota action");
  }
}

// Sets the user to "rejected" and stores `remarks` (shown back to the
// citizen). Requires the caller to already own this user's assessment.
export async function returnUser(uuid: string, remarks: string): Promise<ActionResult<AdminUser>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminUser }>(
      `/users/${uuid}/return`,
      { method: "POST", body: JSON.stringify({ remarks }) },
      "admin",
    );
    revalidateTag("users", "max");
    revalidateTag(`users:${uuid}`, "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "returnUser action");
  }
}


// ── Sanctions ─────────────────────────────────────────────────────────────
//
// All three require an owned claim (403 assessment_not_owned otherwise) and
// are notified server-side — the frontend sends nothing. Each PREPENDS a
// dated, tagged line to assessment_remarks, which is the account's whole
// review history rather than a single current note.

// Any status except already-suspended. Freezes the account read-only, demotes
// a developer to basic and revokes their gateway credentials. The reason is
// required, and becomes the newest "[Suspended …]" remarks line — there is no
// separate field for it.
export async function suspendUser(
  uuid: string,
  reason: string,
): Promise<ActionResult<AdminUser>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminUser }>(
      `/users/${uuid}/suspend`,
      { method: "POST", body: JSON.stringify({ reason }) },
      "admin",
    );
    revalidateUsers(uuid);
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "suspendUser action");
  }
}

// Lifts the freeze. The account returns to `completed` (or `draft` if it never
// completed a profile) and stays BASIC — unsuspending does not restore a
// developer, which has to be re-applied for.
export async function unsuspendUser(uuid: string): Promise<ActionResult<AdminUser>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminUser }>(
      `/users/${uuid}/unsuspend`,
      { method: "POST" },
      "admin",
    );
    revalidateUsers(uuid);
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "unsuspendUser action");
  }
}

// Approved developers only: back to `completed` and basic, credentials
// revoked. The reason is optional here (unlike suspend).
export async function demoteUser(
  uuid: string,
  reason: string,
): Promise<ActionResult<AdminUser>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminUser }>(
      `/users/${uuid}/demote`,
      { method: "POST", body: JSON.stringify(reason.trim() ? { reason: reason.trim() } : {}) },
      "admin",
    );
    revalidateUsers(uuid);
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "demoteUser action");
  }
}
