"use server";

import { revalidateTag } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireClientSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import type { ApiCatalogCredentialSet } from "@/types/api-catalog-credentials";
import type { GatewayCredential } from "@/types/gateway-credential";

function toActionResult(err: unknown, where: string): ActionResult<never> {
  if (isApiError(err)) {
    const safe =
      err.status >= 500 && env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message;
    return { ok: false, status: err.status, message: safe, errors: err.errors };
  }
  void logError(err, { where, audience: "client" });
  return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
}

// User API's POST /api-catalogs/generate-credentials — no request body; the
// backend resolves eligible catalogs from the authenticated account and
// generates credentials for all of them at once. Allowed once ever per
// account (a second call 400s with "Credentials already generated"), and
// there's no GET that exposes previously-generated credentials, so this is
// the only chance the UI ever gets to show them.
export async function generateApiCatalogCredentials(): Promise<
  ActionResult<ApiCatalogCredentialSet[]>
> {
  await requireClientSession();

  try {
    const { data } = await apiFetch<{ data: ApiCatalogCredentialSet[] }>(
      "/api-catalogs/generate-credentials",
      { method: "POST" },
      "client",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "generateApiCatalogCredentials action");
  }
}

// User API's POST /api-catalogs/{identifier}/credential — issues the gateway
// credential for a single catalog. Only one active credential per catalog is
// allowed (400 credential_already_exists — revoke first); some catalogs
// don't support gateway credentials at all (400 credential_not_supported).
// The plaintext is only ever returned here, in `credentials` — store it now.
export async function generateApiCatalogCredential(
  identifier: string,
): Promise<ActionResult<{ credential: GatewayCredential; credentials: Record<string, string> }>> {
  await requireClientSession();

  try {
    const { data, credentials } = await apiFetch<{
      data: GatewayCredential;
      credentials: Record<string, string>;
    }>(`/api-catalogs/${identifier}/credential`, { method: "POST" }, "client");
    revalidateTag("api-catalogs", "max");
    return { ok: true, data: { credential: data, credentials } };
  } catch (err) {
    return toActionResult(err, "generateApiCatalogCredential action");
  }
}

// User API's DELETE /api-catalogs/{identifier}/credential — revokes the
// caller's active credential for this catalog so a new one can be generated.
export async function revokeApiCatalogCredential(
  identifier: string,
): Promise<ActionResult<GatewayCredential>> {
  await requireClientSession();

  try {
    const { data } = await apiFetch<{ data: GatewayCredential }>(
      `/api-catalogs/${identifier}/credential`,
      { method: "DELETE" },
      "client",
    );
    revalidateTag("api-catalogs", "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "revokeApiCatalogCredential action");
  }
}
