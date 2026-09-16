"use server";

import { revalidateTag } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import type { Administrator } from "@/types/administrator";
import type { Role } from "@/types/access-control";
import type { AdministratorValues } from "@/modules/administrators/schemas/administrator-schema";

function toActionResult(err: unknown, where: string): ActionResult<never> {
  if (isApiError(err)) {
    const safe =
      err.status >= 500 && env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message;
    return { ok: false, status: err.status, message: safe, errors: err.errors };
  }
  // logError is fire-and-forget here since this helper isn't async
  void logError(err, { where, audience: "admin" });
  return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
}

export async function getAdministrator(id: number): Promise<ActionResult<Administrator>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: Administrator }>(
      `/administrators/${id}`,
      { next: { tags: [`administrators:${id}`] } },
      "admin",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "getAdministrator action");
  }
}

export async function createAdministrator(
  values: AdministratorValues,
): Promise<ActionResult<Administrator>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: Administrator }>(
      "/administrators",
      { method: "POST", body: JSON.stringify(values) },
      "admin",
    );
    revalidateTag("administrators", "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "createAdministrator action");
  }
}

export async function updateAdministrator(
  id: number,
  values: AdministratorValues,
): Promise<ActionResult<Administrator>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: Administrator }>(
      `/administrators/${id}`,
      { method: "PUT", body: JSON.stringify(values) },
      "admin",
    );
    revalidateTag("administrators", "max");
    revalidateTag(`administrators:${id}`, "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "updateAdministrator action");
  }
}

export async function deleteAdministrator(id: number): Promise<ActionResult<Administrator>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: Administrator }>(
      `/administrators/${id}`,
      { method: "DELETE" },
      "admin",
    );
    revalidateTag("administrators", "max");
    revalidateTag(`administrators:${id}`, "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "deleteAdministrator action");
  }
}

export async function toggleAdministratorStatus(
  id: number,
): Promise<ActionResult<Administrator>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: Administrator }>(
      `/administrators/${id}/toggle-active-status`,
      { method: "POST" },
      "admin",
    );
    revalidateTag("administrators", "max");
    revalidateTag(`administrators:${id}`, "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "toggleAdministratorStatus action");
  }
}

export async function resetAdministratorPassword(
  id: number,
): Promise<ActionResult<Administrator>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: Administrator }>(
      `/administrators/${id}/reset-password`,
      { method: "POST" },
      "admin",
    );
    revalidateTag("administrators", "max");
    revalidateTag(`administrators:${id}`, "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "resetAdministratorPassword action");
  }
}

export async function syncAdministratorRoles(
  id: number,
  roleIds: number[],
): Promise<ActionResult<Administrator>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: Administrator }>(
      `/administrators/${id}/sync-roles`,
      { method: "POST", body: JSON.stringify({ role_ids: roleIds }) },
      "admin",
    );
    revalidateTag("administrators", "max");
    revalidateTag(`administrators:${id}`, "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "syncAdministratorRoles action");
  }
}

export async function getRolesForPicker(): Promise<ActionResult<Role[]>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: Role[] }>(
      "/roles?per_page=100",
      { next: { tags: ["roles"] } },
      "admin",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "getRolesForPicker action");
  }
}
