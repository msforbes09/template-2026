"use server";

import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireAdminSession, requireClientSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import type { UploadedFile } from "@/types/upload";

function toActionResult(
  err: unknown,
  where: string,
  audience: "admin" | "client" = "admin",
): ActionResult<never> {
  if (isApiError(err)) {
    const safe =
      err.status >= 500 && env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message;
    return { ok: false, status: err.status, message: safe, errors: err.errors };
  }
  void logError(err, { where, audience });
  return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
}

// Both Common API Files endpoints require an authenticated Bearer token
// (from whichever audience is calling).

export async function uploadPrivateFile(formData: FormData): Promise<ActionResult<UploadedFile>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: UploadedFile }>(
      "/files/private",
      { method: "POST", body: formData },
      "admin",
      "/common",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "uploadPrivateFile action");
  }
}

export async function uploadPublicFile(formData: FormData): Promise<ActionResult<UploadedFile>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: UploadedFile }>(
      "/files/public",
      { method: "POST", body: formData },
      "admin",
      "/common",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "uploadPublicFile action");
  }
}

// Client-audience counterpart to uploadPrivateFile, used for the
// registration wizard's profile photo (modules/client-auth).
export async function uploadClientPrivateFile(formData: FormData): Promise<ActionResult<UploadedFile>> {
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: UploadedFile }>(
      "/files/private",
      { method: "POST", body: formData },
      "client",
      "/common",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "uploadClientPrivateFile action", "client");
  }
}
