"use server";

import { revalidateTag } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import type { GalleryImage } from "@/types/gallery";

function toActionResult(err: unknown, where: string): ActionResult<never> {
  if (isApiError(err)) {
    const safe =
      err.status >= 500 && env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message;
    return { ok: false, status: err.status, message: safe, errors: err.errors };
  }
  void logError(err, { where, audience: "admin" });
  return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
}

export async function uploadGalleryImage(formData: FormData): Promise<ActionResult<GalleryImage>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: GalleryImage }>(
      "/galleries",
      { method: "POST", body: formData },
      "admin",
    );
    revalidateTag("galleries", "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "uploadGalleryImage action");
  }
}

export async function deleteGalleryImage(uuid: string): Promise<ActionResult<GalleryImage>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: GalleryImage }>(
      `/galleries/${uuid}`,
      { method: "DELETE" },
      "admin",
    );
    revalidateTag("galleries", "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "deleteGalleryImage action");
  }
}
