"use server";

import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireClientSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import type { EgovTestAccount } from "@/types/client-user";

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

// The generator has no form library behind it — it shows a single message — so
// the documented failures are turned into something readable here rather than
// left as whatever the API happened to say.
//
// 400 in particular is not a bug report: exchange_code_generation_failed means
// eGov didn't hand back a code this time, and retrying is the right advice.
function describeGenerateFailure(result: ActionResult<never>): ActionResult<never> {
  if (result.ok) return result;
  switch (result.status) {
    case 400:
      return { ...result, message: "eGov didn't return a code for that test account. Try again." };
    case 403:
      return {
        ...result,
        message: "Your account needs to be approved before you can generate an exchange code.",
      };
    case 422:
      // errors.email is the specific one — "not a test account", "invalid" —
      // and is more useful than the generic top-level message.
      return { ...result, message: result.errors.email?.[0] ?? result.message };
    case 429:
      return { ...result, message: "Too quick — wait a few seconds and generate again." };
    default:
      return result;
  }
}

// Lists the eGov test accounts usable with generate-exchange-code (User
// API's GET /egov/test-accounts) — email + name only, no id, so email
// doubles as the identifier passed back to generateExchangeCode.
export async function listTestAccounts(): Promise<ActionResult<EgovTestAccount[]>> {
  await requireClientSession();

  try {
    const { data } = await apiFetch<{ data: EgovTestAccount[] }>(
      "/egov/test-accounts",
      {},
      "client",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "listTestAccounts action");
  }
}

// Mints an eGov exchange code for the given test account (User API's POST
// /egov/generate-exchange-code — the response has no `data` envelope, unlike
// most endpoints).
//
// The email is the ONLY input. partner_code used to travel with it, chosen by
// the tester; the code is now always minted against this platform's own eGov
// partner from server-side config, and the field is ignored if still sent
// (2026-08-17 handoff). Sending it anyway would be harmless but dishonest — it
// would imply a choice the caller no longer has.
export async function generateExchangeCode(
  email: string,
): Promise<ActionResult<{ exchangeCode: string }>> {
  await requireClientSession();

  try {
    const data = await apiFetch<{ exchange_code: string }>(
      "/egov/generate-exchange-code",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
      "client",
    );
    return { ok: true, data: { exchangeCode: data.exchange_code } };
  } catch (err) {
    return describeGenerateFailure(toActionResult(err, "generateExchangeCode action"));
  }
}
