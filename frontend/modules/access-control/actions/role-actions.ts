"use server";

import { revalidateTag } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import type { Role, PermissionGroup } from "@/types/access-control";
import type { RoleValues } from "@/modules/access-control/schemas/role-schema";

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

export async function getRole(id: number): Promise<ActionResult<Role>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: Role }>(
      `/roles/${id}`,
      { next: { tags: [`roles:${id}`] } },
      "admin",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "getRole action");
  }
}

export async function createRole(values: RoleValues): Promise<ActionResult<Role>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: Role }>(
      "/roles",
      { method: "POST", body: JSON.stringify(values) },
      "admin",
    );
    revalidateTag("roles", "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "createRole action");
  }
}

export async function updateRole(id: number, values: RoleValues): Promise<ActionResult<Role>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: Role }>(
      `/roles/${id}`,
      { method: "PUT", body: JSON.stringify(values) },
      "admin",
    );
    revalidateTag("roles", "max");
    revalidateTag(`roles:${id}`, "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "updateRole action");
  }
}

export async function deleteRole(id: number): Promise<ActionResult<Role>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: Role }>(
      `/roles/${id}`,
      { method: "DELETE" },
      "admin",
    );
    revalidateTag("roles", "max");
    revalidateTag(`roles:${id}`, "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "deleteRole action");
  }
}

export async function syncRolePermissions(
  id: number,
  permissionIds: number[],
): Promise<ActionResult<Role>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: Role }>(
      `/roles/${id}/sync-permissions`,
      { method: "POST", body: JSON.stringify({ permission_ids: permissionIds }) },
      "admin",
    );
    revalidateTag("roles", "max");
    revalidateTag(`roles:${id}`, "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "syncRolePermissions action");
  }
}

export async function getPermissionGroups(): Promise<ActionResult<PermissionGroup[]>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: PermissionGroup[] }>(
      "/permissions",
      { next: { tags: ["permissions"] } },
      "admin",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "getPermissionGroups action");
  }
}
