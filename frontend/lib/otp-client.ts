import { env } from "@/lib/env";

// Shared/common backend endpoint — not audience-specific (used by client
// registration, client 2FA login, admin 2FA login, and client
// forgot-password), so it lives at the top level rather than under
// modules/client-auth/lib or modules/admin/lib. Direct browser-to-backend
// call, same convention as the audience-specific auth clients.
// See the backend's /api/documentation/common.
const BASE = `${env.NEXT_PUBLIC_API_URL}/common`;

type ErrorEnvelope = {
  error?: string;
  message?: string;
  error_description?: string;
  meta?: Record<string, unknown>;
};

// resend_token ROTATES on every successful ("sent") call — callers must
// store the new one for the next resend. On "throttled"/"error" the
// backend does not issue a new token, so callers keep the old one.
export type ResendOtpResult =
  | { kind: "sent"; resendToken: string; retryAfter: number }
  | { kind: "throttled"; retryAfter: number; locked: boolean; message: string }
  | { kind: "error"; status: number; message: string };

async function parseBody(
  res: Response,
): Promise<ErrorEnvelope & { resend_token?: string; retry_after?: number }> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

const NETWORK_ERROR_MESSAGE = "Couldn't reach the server. Check your connection and try again.";

export async function resendOtp(input: {
  resendToken: string;
  captcha?: string;
}): Promise<ResendOtpResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/otp/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ resend_token: input.resendToken, captcha: input.captcha }),
    });
  } catch {
    return { kind: "error", status: 0, message: NETWORK_ERROR_MESSAGE };
  }
  const body = await parseBody(res);

  if (res.status === 200) {
    return {
      kind: "sent",
      resendToken: String(body.resend_token ?? ""),
      retryAfter: Number(body.retry_after ?? 60),
    };
  }
  if (res.status === 429) {
    const meta = body.meta ?? {};
    return {
      kind: "throttled",
      retryAfter: Number(meta.retry_after ?? 60),
      locked: body.error === "otp_locked",
      message:
        body.message ?? body.error_description ?? "Please wait before requesting another code.",
    };
  }
  return {
    kind: "error",
    status: res.status,
    message: body.message ?? body.error_description ?? "Unable to resend the code right now.",
  };
}
