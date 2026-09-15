"use server";

import { revalidateTag } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import type { ApiCatalog } from "@/types/api-catalog";
import type { ApiCatalogValues } from "@/modules/api-catalog/schemas/api-catalog-schema";

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

export async function getApiCatalog(id: number): Promise<ActionResult<ApiCatalog>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: ApiCatalog }>(
      `/api-catalogs/${id}`,
      { next: { tags: [`api-catalogs:${id}`] } },
      "admin",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "getApiCatalog action");
  }
}

export async function updateApiCatalog(
  id: number,
  values: ApiCatalogValues,
): Promise<ActionResult<ApiCatalog>> {
  await requireAdminSession();
  try {
    // Only name/description/body/meta are updatable per the API contract.
    // meta arrives as a JSON string from the editor; parsed here, or null to
    // clear (the schema already guaranteed it parses to an object).
    const payload = {
      name: values.name,
      description: values.description?.trim() ? values.description : null,
      body: values.body?.trim() ? values.body : null,
      meta: values.meta?.trim() ? (JSON.parse(values.meta) as Record<string, unknown>) : null,
    };
    const { data } = await apiFetch<{ data: ApiCatalog }>(
      `/api-catalogs/${id}`,
      { method: "PUT", body: JSON.stringify(payload) },
      "admin",
    );
    revalidateTag("api-catalogs", "max");
    revalidateTag(`api-catalogs:${id}`, "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "updateApiCatalog action");
  }
}

export async function toggleApiCatalogStatus(id: number): Promise<ActionResult<ApiCatalog>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: ApiCatalog }>(
      `/api-catalogs/${id}/toggle-active-status`,
      { method: "POST" },
      "admin",
    );
    revalidateTag("api-catalogs", "max");
    revalidateTag(`api-catalogs:${id}`, "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "toggleApiCatalogStatus action");
  }
}
