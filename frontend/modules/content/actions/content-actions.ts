"use server";

import { revalidateTag } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { sanitizeContentHtml } from "@/lib/sanitize-content";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import type { Content } from "@/types/content";
import type { ContentValues } from "@/modules/content/schemas/content-schema";

// Only the "en" locale is documented/exercised by the admin API today — see
// types/content.ts. Wrapping/unwrapping it here keeps the form and schema
// flat (a single `body` string) while matching the locale-keyed wire shape.
const LOCALE = "en";

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

function toPayload(values: ContentValues) {
  return {
    identifier: values.identifier,
    body: { [LOCALE]: values.body },
    meta: values.title ? { title: values.title } : null,
  };
}

// The read-only preview for admins without contents-manage: the same show
// read as getContent (the WS gates it on contents-view), but the body comes
// back SANITIZED — sanitizeContentHtml is server-only, and the viewer injects
// this HTML with dangerouslySetInnerHTML, so raw markup must never cross to
// the client on this path. getContent stays raw: the edit form feeds a TipTap
// editor, not an HTML sink.
export async function getContentPreview(
  id: number,
): Promise<ActionResult<{ identifier: string; title: string | null; html: string }>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: Content }>(
      `/contents/${id}`,
      { next: { tags: [`contents:${id}`] } },
      "admin",
    );
    return {
      ok: true,
      data: {
        identifier: data.identifier,
        title: data.meta?.title ?? null,
        html: sanitizeContentHtml(data.body.en ?? ""),
      },
    };
  } catch (err) {
    return toActionResult(err, "getContentPreview action");
  }
}

export async function getContent(id: number): Promise<ActionResult<Content>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: Content }>(
      `/contents/${id}`,
      { next: { tags: [`contents:${id}`] } },
      "admin",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "getContent action");
  }
}

export async function createContent(values: ContentValues): Promise<ActionResult<Content>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: Content }>(
      "/contents",
      { method: "POST", body: JSON.stringify(toPayload(values)) },
      "admin",
    );
    revalidateTag("contents", "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "createContent action");
  }
}

export async function updateContent(
  id: number,
  values: ContentValues,
): Promise<ActionResult<Content>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: Content }>(
      `/contents/${id}`,
      { method: "PUT", body: JSON.stringify(toPayload(values)) },
      "admin",
    );
    revalidateTag("contents", "max");
    revalidateTag(`contents:${id}`, "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "updateContent action");
  }
}

export async function deleteContent(id: number): Promise<ActionResult<Content>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: Content }>(
      `/contents/${id}`,
      { method: "DELETE" },
      "admin",
    );
    revalidateTag("contents", "max");
    revalidateTag(`contents:${id}`, "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "deleteContent action");
  }
}
