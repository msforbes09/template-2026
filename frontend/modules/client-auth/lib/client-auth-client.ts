import { env } from "@/lib/env";

// Direct browser-to-backend auth exchange — no Next.js route in between.
// See the backend's /api/documentation/users.
const BASE = `${env.NEXT_PUBLIC_API_URL}/user`;

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

export type RegisterResult =
  | { kind: "sent"; resendToken: string; retryAfter: number }
  | { kind: "error"; status: number; message: string; errors: Record<string, string[]> };

export type VerifyRegistrationResult =
  | { kind: "authenticated"; token: string }
  | {
      kind: "error";
      status: number;
      message: string;
      errors: Record<string, string[]>;
      remainingAttempts?: number;
    };

export type ClientAuthResult =
  | { kind: "authenticated"; token: string; deviceToken?: string }
  | {
      kind: "two_factor_required";
      authToken: string;
      resendToken: string;
      retryAfter: number;
    }
  | { kind: "error"; status: number; message: string; errors: Record<string, string[]> };

export type ClientTwoFactorResult =
  | { kind: "authenticated"; token: string; deviceToken?: string }
  | {
      kind: "error";
      status: number;
      message: string;
      errors: Record<string, string[]>;
      remainingAttempts?: number;
    };

export type ForgotPasswordResult =
  | { kind: "sent"; resendToken: string; retryAfter: number }
  | { kind: "error"; status: number; message: string; errors: Record<string, string[]> };

export type ResetPasswordResult =
  | { kind: "authenticated"; token: string }
  | {
      kind: "error";
      status: number;
      message: string;
      errors: Record<string, string[]>;
      remainingAttempts?: number;
    };

async function parseBody(
  res: Response,
): Promise<
  ErrorEnvelope &
    ValidationError & { token?: string; device_token?: string; resend_token?: string }
> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

const NETWORK_ERROR_MESSAGE = "Couldn't reach the server. Check your connection and try again.";

export async function registerClient(input: {
  email: string;
  company_name: string;
  first_name: string;
  last_name: string;
  captcha: string;
}): Promise<RegisterResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        email: input.email,
        company_name: input.company_name,
        first_name: input.first_name,
        last_name: input.last_name,
        captcha: input.captcha,
      }),
    });
  } catch {
    return { kind: "error", status: 0, message: NETWORK_ERROR_MESSAGE, errors: {} };
  }
  const body = await parseBody(res);

  if (res.status === 200) {
    const meta = body.meta ?? {};
    return {
      kind: "sent",
      resendToken: String(body.resend_token ?? meta.resend_token ?? ""),
      retryAfter: Number(meta.retry_after ?? 60),
    };
  }
  if (res.status === 422) {
    return {
      kind: "error",
      status: 422,
      message: body.message ?? "Check your details and try again.",
      errors: body.errors ?? {},
    };
  }
  return {
    kind: "error",
    status: res.status,
    message: body.message ?? body.error_description ?? "Unable to register right now.",
    errors: {},
  };
}

export async function verifyRegistrationClient(input: {
  email: string;
  otp: string;
  password: string;
  password_confirmation: string;
}): Promise<VerifyRegistrationResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/verify-registration`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        email: input.email,
        otp: input.otp,
        password: input.password,
        password_confirmation: input.password_confirmation,
      }),
    });
  } catch {
    return { kind: "error", status: 0, message: NETWORK_ERROR_MESSAGE, errors: {} };
  }
  const body = await parseBody(res);

  if (res.status === 200 && body.token) {
    return { kind: "authenticated", token: body.token };
  }
  if (res.status === 400) {
    const meta = body.meta ?? {};
    return {
      kind: "error",
      status: 400,
      message: body.message ?? body.error_description ?? "That code did not work.",
      errors: {},
      remainingAttempts:
        meta.remaining_attempts !== undefined ? Number(meta.remaining_attempts) : undefined,
    };
  }
  if (res.status === 422) {
    return {
      kind: "error",
      status: 422,
      message: body.message ?? "Check your details and try again.",
      errors: body.errors ?? {},
    };
  }
  return {
    kind: "error",
    status: res.status,
    message: body.message ?? body.error_description ?? "Unable to verify your account.",
    errors: {},
  };
}

export async function authenticateClient(input: {
  email: string;
  password: string;
  captcha: string;
  deviceToken?: string;
}): Promise<ClientAuthResult> {
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
    // `body.message` is deliberately DROPPED: the caller knows the email it
    // just submitted and writes a masked, specific sentence itself — same as
    // the registration step already does.
    return {
      kind: "two_factor_required",
      authToken: String(meta.auth_token ?? ""),
      resendToken: String(meta.resend_token ?? ""),
      retryAfter: Number(meta.retry_after ?? 60),
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
    message: body.message ?? body.error_description ?? "Unable to sign in.",
    errors: {},
  };
}

export async function verifyTwoFactorClient(input: {
  authToken: string;
  pin: string;
  captcha: string;
}): Promise<ClientTwoFactorResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/two-factor-authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        auth_token: input.authToken,
        pin: input.pin,
        captcha: input.captcha,
      }),
    });
  } catch {
    return { kind: "error", status: 0, message: NETWORK_ERROR_MESSAGE, errors: {} };
  }
  const body = await parseBody(res);

  if (res.status === 200 && body.token) {
    return { kind: "authenticated", token: body.token, deviceToken: body.device_token };
  }
  const meta = body.meta ?? {};
  return {
    kind: "error",
    status: res.status,
    message: body.message ?? body.error_description ?? "That code did not work.",
    errors: {},
    remainingAttempts:
      meta.remaining_attempts !== undefined ? Number(meta.remaining_attempts) : undefined,
  };
}

export async function forgotPasswordClient(input: {
  email: string;
  captcha: string;
}): Promise<ForgotPasswordResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        email: input.email,
        captcha: input.captcha,
      }),
    });
  } catch {
    return { kind: "error", status: 0, message: NETWORK_ERROR_MESSAGE, errors: {} };
  }
  const body = await parseBody(res);

  if (res.status === 200) {
    const meta = body.meta ?? {};
    return {
      kind: "sent",
      resendToken: String(body.resend_token ?? meta.resend_token ?? ""),
      retryAfter: Number(meta.retry_after ?? 60),
    };
  }
  if (res.status === 422) {
    return {
      kind: "error",
      status: 422,
      message: body.message ?? "Check your details and try again.",
      errors: body.errors ?? {},
    };
  }
  return {
    kind: "error",
    status: res.status,
    message: body.message ?? body.error_description ?? "Unable to send a reset code right now.",
    errors: {},
  };
}

export async function resetPasswordClient(input: {
  email: string;
  otp: string;
  new_password: string;
  new_password_confirmation: string;
  captcha: string;
}): Promise<ResetPasswordResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        email: input.email,
        otp: input.otp,
        new_password: input.new_password,
        new_password_confirmation: input.new_password_confirmation,
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
  if (res.status === 400) {
    const meta = body.meta ?? {};
    return {
      kind: "error",
      status: 400,
      message: body.message ?? body.error_description ?? "That code did not work.",
      errors: {},
      remainingAttempts:
        meta.remaining_attempts !== undefined ? Number(meta.remaining_attempts) : undefined,
    };
  }
  if (res.status === 422) {
    return {
      kind: "error",
      status: 422,
      message: body.message ?? "Check your details and try again.",
      errors: body.errors ?? {},
    };
  }
  return {
    kind: "error",
    status: res.status,
    message: body.message ?? body.error_description ?? "Unable to reset your password.",
    errors: {},
  };
}
