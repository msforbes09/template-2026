"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider, type UseFormReturn } from "react-hook-form";
import { applyResultErrors } from "@/lib/apply-result-errors";
import { useResetOnHide } from "@/hooks/use-reset-on-hide";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppFormField } from "@/components/ui/app-form-field";
import { FormRootError } from "@/components/ui/form-root-error";
import { MAINTENANCE_MESSAGE } from "@/lib/maintenance";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { OtpField } from "@/components/ui/otp-field";
import { TurnstileField } from "@/components/ui/turnstile-field";
import {
  loginSchema,
  twoFactorSchema,
  type LoginValues,
  type TwoFactorValues,
} from "@/modules/admin/schemas/login-schema";
import {
  authenticateAdmin,
  verifyTwoFactor,
  type AdminAuthResult,
  type TwoFactorResult,
} from "@/modules/admin/lib/admin-auth-client";
import { resendOtp } from "@/lib/otp-client";
import { setAdminDeviceToken, getAdminDeviceToken } from "@/modules/admin/lib/session-cookie";
import { writeAdminSession } from "@/modules/admin/actions/session-actions";

const CAPTCHA_REQUIRED_MESSAGE = "Please complete the verification and try again.";

type Step =
  | { name: "credentials" }
  | {
      name: "two_factor";
      authToken: string;
      email: string;
      resendToken: string;
      retryAfter: number;
      message: string;
    };

export function AdminLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "credentials" });

  const credentialsForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const otpForm = useForm<TwoFactorValues>({ resolver: zodResolver(twoFactorSchema) });

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  // Everything here is discarded when the route is navigated away from.
  //
  // Two reasons. A Turnstile token is single-use and short-lived, and the
  // submit button is gated on holding one — without this the button reappears
  // enabled around a token the server will reject. And the fields themselves
  // are credentials: cacheComponents only HIDES this route, so a half-typed
  // sign-in would otherwise still be sitting here for whoever opens the page
  // next, on a shared machine included.
  useResetOnHide(() => {
    setCaptchaToken(null);
    turnstileRef.current?.reset();
    setStep({ name: "credentials" });
    credentialsForm.reset();
    otpForm.reset();
  });

  async function handleAuthResult(result: AdminAuthResult, values: LoginValues) {
    if (result.kind === "authenticated") {
      const written = await writeAdminSession({ email: values.email, accessToken: result.token });
      if (!written.ok) {
        credentialsForm.setError("root", { message: written.message });
        return;
      }
      if (result.deviceToken) setAdminDeviceToken(result.deviceToken);
      // Clear the credentials, not just the step. cacheComponents keeps this
      // route mounted-but-hidden via React <Activity> after we navigate into
      // the app, so an unreset form is still holding an email and password when
      // anyone returns to this page — including the next person to use the
      // machine.
      credentialsForm.reset();
      otpForm.reset();
      router.push("/admin");
      router.refresh();
      return;
    }
    // 503 after the credentials were accepted: the backend is in maintenance
    // and only is_developer administrators may sign in. Shown as the shared
    // maintenance sentence rather than the raw envelope, so it does not read
    // as "your password was wrong".
    if (result.kind === "error" && result.status === 503) {
      credentialsForm.setError("root", { message: MAINTENANCE_MESSAGE });
      return;
    }

    if (result.kind === "two_factor_required") {
      setStep({
        name: "two_factor",
        authToken: result.authToken,
        email: values.email,
        resendToken: result.resendToken,
        retryAfter: result.retryAfter,
        message: result.message,
      });
      otpForm.reset();
      return;
    }
    applyResultErrors(credentialsForm, result, ["email", "password"]);
  }

  async function submitCredentials(values: LoginValues) {
    if (!captchaToken) {
      credentialsForm.setError("root", { message: CAPTCHA_REQUIRED_MESSAGE });
      return;
    }
    const captcha = captchaToken;
    turnstileRef.current?.reset();
    setCaptchaToken(null);
    const result = await authenticateAdmin({
      ...values,
      captcha,
      deviceToken: getAdminDeviceToken(),
    });
    await handleAuthResult(result, values);
  }

  async function submitOtp(values: TwoFactorValues, captcha: string) {
    if (step.name !== "two_factor") return;
    const result: TwoFactorResult = await verifyTwoFactor({
      authToken: step.authToken,
      pin: values.pin,
      captcha,
    });
    // Same as the credentials step: the 503 arrives AFTER the code is
    // accepted, so it is maintenance, not a bad code.
    if (result.kind === "error" && result.status === 503) {
      otpForm.setError("root", { message: MAINTENANCE_MESSAGE });
      return;
    }

    if (result.kind === "authenticated") {
      const written = await writeAdminSession({ email: step.email, accessToken: result.token });
      if (!written.ok) {
        otpForm.setError("root", { message: written.message });
        return;
      }
      if (result.deviceToken) setAdminDeviceToken(result.deviceToken);
      // Reset before navigating away. cacheComponents renders routes inside
      // React <Activity>, which HIDES this route rather than unmounting it, so
      // its state survives into a later visit to /admin/login — the step (which
      // stranded admins on the OTP screen after signing out and back in) and,
      // until now, the email and password too.
      setStep({ name: "credentials" });
      credentialsForm.reset();
      otpForm.reset();
      router.push("/admin");
      router.refresh();
      return;
    }
    applyResultErrors(otpForm, result, ["pin"]);
  }

  async function resendCode(captcha: string): Promise<number> {
    if (step.name !== "two_factor") return 0;
    const result = await resendOtp({ resendToken: step.resendToken, captcha });
    if (result.kind === "sent") {
      setStep({ ...step, resendToken: result.resendToken });
      return result.retryAfter;
    }
    otpForm.setError("root", { message: result.message });
    return result.kind === "throttled" ? result.retryAfter : 0;
  }

  if (step.name === "two_factor") {
    return (
      <TwoFactorStep
        form={otpForm}
        message={step.message}
        retryAfter={step.retryAfter}
        onSubmit={submitOtp}
        onResend={resendCode}
        onBack={() => setStep({ name: "credentials" })}
      />
    );
  }

  return (
    <FormProvider {...credentialsForm}>
      <form
        onSubmit={(event) => {
          void credentialsForm.handleSubmit(submitCredentials)(event);
        }}
        className="space-y-5"
        noValidate
      >
        <AppFormField label="Email" isRequired error={credentialsForm.formState.errors.email?.message}>
          <Input
            type="email"
            autoComplete="username"
            placeholder="admin@egov.ph"
            {...credentialsForm.register("email")}
          />
        </AppFormField>
        <AppFormField
          label="Password"
          isRequired
          error={credentialsForm.formState.errors.password?.message}
        >
          <Input
            type="password"
            autoComplete="current-password"
            {...credentialsForm.register("password")}
          />
        </AppFormField>
        <TurnstileField
          ref={turnstileRef}
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken(null)}
        />
        <FormRootError />
        <FormSubmitButton className="h-10 w-full" disabled={!captchaToken}>
          Sign in
        </FormSubmitButton>
      </form>
    </FormProvider>
  );
}

function TwoFactorStep({
  form,
  message,
  retryAfter,
  onSubmit,
  onResend,
  onBack,
}: {
  form: UseFormReturn<TwoFactorValues>;
  message: string;
  retryAfter: number;
  onSubmit: (values: TwoFactorValues, captcha: string) => Promise<void>;
  onResend: (captcha: string) => Promise<number>;
  onBack: () => void;
}) {
  const [cooldown, setCooldown] = useState(retryAfter);
  const [resending, setResending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  // A Turnstile token is single-use and short-lived, and the submit button is
  // gated on holding one. Navigating away only HIDES this route, so without
  // this the button reappears enabled around a token the server will reject.
  useResetOnHide(() => {
    setCaptchaToken(null);
    turnstileRef.current?.reset();
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((current) => current - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function consumeCaptcha() {
    const token = captchaToken;
    turnstileRef.current?.reset();
    setCaptchaToken(null);
    return token;
  }

  async function handleSubmit(values: TwoFactorValues) {
    if (!captchaToken) {
      form.setError("root", { message: CAPTCHA_REQUIRED_MESSAGE });
      return;
    }
    await onSubmit(values, consumeCaptcha()!);
  }

  async function handleResend() {
    if (!captchaToken) {
      form.setError("root", { message: CAPTCHA_REQUIRED_MESSAGE });
      return;
    }
    setResending(true);
    try {
      const nextCooldown = await onResend(consumeCaptcha()!);
      setCooldown(nextCooldown);
    } finally {
      setResending(false);
    }
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={(event) => {
          void form.handleSubmit(handleSubmit)(event);
        }}
        className="space-y-5"
        noValidate
      >
        <p role="status" className="text-sm leading-relaxed text-muted-foreground">
          {message}
        </p>
        <AppFormField label="Verification code" isRequired error={form.formState.errors.pin?.message}>
          <OtpField control={form.control} name="pin" length={6} />
        </AppFormField>
        <TurnstileField
          ref={turnstileRef}
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken(null)}
        />
        <FormRootError />
        <FormSubmitButton className="h-10 w-full" disabled={!captchaToken}>
          Verify
        </FormSubmitButton>
        <div className="flex items-center justify-between text-sm">
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-muted-foreground"
            onClick={onBack}
          >
            Back to sign in
          </Button>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            disabled={cooldown > 0 || resending || !captchaToken}
            onClick={handleResend}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
