import { env } from "@/lib/env";

// Direct browser-to-backend auth exchange — no Next.js route in between.
// See the backend's /api/documentation/administrators.
const BASE = `${env.NEXT_PUBLIC_API_URL}/administrator`;

type ErrorEnvelope = {
  error?: string;
  message?: string;
  error_description?: string;
  meta?: Record<string, unknown>;
};

type ValidationError = {
  message?: string;
  errors?: Record<string, string[]>;
};

export type AdminAuthResult =
  | { kind: "authenticated"; token: string; deviceToken?: string }
  | {
      kind: "two_factor_required";
      authToken: string;
      resendToken: string;
      retryAfter: number;
      message: string;
    }
  | { kind: "error"; status: number; message: string; errors: Record<string, string[]> };

export type TwoFactorResult =
  | { kind: "authenticated"; token: string; deviceToken?: string }
  | { kind: "error"; status: number; message: string; errors: Record<string, string[]> };

async function parseBody(
  res: Response,
): Promise<ErrorEnvelope & ValidationError & { token?: string; device_token?: string }> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

const NETWORK_ERROR_MESSAGE = "Couldn't reach the server. Check your connection and try again.";

export async function authenticateAdmin(input: {
  email: string;
  password: string;
  captcha: string;
  deviceToken?: string;
}): Promise<AdminAuthResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        device_token: input.deviceToken,
        captcha: input.captcha,
      }),
    });
  } catch {
    return { kind: "error", status: 0, message: NETWORK_ERROR_MESSAGE, errors: {} };
  }
  const body = await parseBody(res);

  if (res.status === 200 && body.token) {
    return { kind: "authenticated", token: body.token };
  }
  if (res.status === 428) {
    const meta = body.meta ?? {};
    return {
      kind: "two_factor_required",
      authToken: String(meta.auth_token ?? ""),
      resendToken: String(meta.resend_token ?? ""),
      retryAfter: Number(meta.retry_after ?? 60),
      message: body.message ?? "A verification code has been sent to your email.",
    };
  }
  if (res.status === 422) {
    return {
      kind: "error",
      status: 422,
      message: body.message ?? "Enter a valid email and password.",
      errors: body.errors ?? {},
    };
  }
  return {
    kind: "error",
    status: res.status,
    message: body.message ?? "Unable to sign in.",
    errors: {},
  };
}

export async function verifyTwoFactor(input: {
  authToken: string;
  pin: string;
  captcha: string;
}): Promise<TwoFactorResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/two-factor-authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ auth_token: input.authToken, pin: input.pin, captcha: input.captcha }),
    });
  } catch {
    return { kind: "error", status: 0, message: NETWORK_ERROR_MESSAGE, errors: {} };
  }
  const body = await parseBody(res);

  if (res.status === 200 && body.token) {
    return { kind: "authenticated", token: body.token, deviceToken: body.device_token };
  }
  return {
    kind: "error",
    status: res.status,
    message: body.message ?? "That code did not work.",
    errors: {},
  };
}
