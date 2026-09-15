"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, FormProvider, type UseFormReturn } from "react-hook-form";
import { applyResultErrors } from "@/lib/apply-result-errors";
import { useResetOnHide } from "@/hooks/use-reset-on-hide";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { AppFormField } from "@/components/ui/app-form-field";
import { FormRootError } from "@/components/ui/form-root-error";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { OtpField } from "@/components/ui/otp-field";
import { TurnstileField } from "@/components/ui/turnstile-field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  loginSchema,
  twoFactorSchema,
  type LoginValues,
  type TwoFactorValues,
} from "@/modules/client-auth/schemas/login-schema";
import {
  authenticateClient,
  verifyTwoFactorClient,
  type ClientAuthResult,
  type ClientTwoFactorResult,
} from "@/modules/client-auth/lib/client-auth-client";
import { maskEmail, maskMobileNumber } from "@/lib/mask-identifier";
import { resendOtp } from "@/lib/otp-client";
import { setClientDeviceToken, getClientDeviceToken } from "@/modules/client-auth/lib/session-cookie";
import { writeClientSession } from "@/modules/client-auth/actions/session-actions";

const CAPTCHA_REQUIRED_MESSAGE = "Please complete the verification and try again.";

type Step =
  | { name: "credentials" }
  | {
      name: "two_factor";
      authToken: string;
      channel: "email" | "sms";
      email: string;
      mobileNumber: string;
      resendToken: string;
      retryAfter: number;
      message: string;
    };

export function ClientLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "credentials" });

  const credentialsForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { channel: "email", email: "", mobile_number: "", password: "" },
  });
  const channel = credentialsForm.watch("channel");
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

  async function handleAuthResult(
    result: ClientAuthResult,
    identifier: { channel: "email" | "sms"; email: string; mobileNumber: string },
  ) {
    if (result.kind === "authenticated") {
      const written = await writeClientSession({
        username: identifier.channel === "email" ? identifier.email : identifier.mobileNumber,
        accessToken: result.token,
      });
      if (!written.ok) {
        credentialsForm.setError("root", { message: written.message });
        return;
      }
      if (result.deviceToken) setClientDeviceToken(result.deviceToken);
      // Clear the credentials, not just the step. cacheComponents keeps this
      // route mounted-but-hidden via React <Activity> after we navigate into
      // the app, so an unreset form is still holding an email and password when
      // anyone returns to this page — including the next person to use the
      // machine.
      credentialsForm.reset();
      otpForm.reset();
      router.push("/dashboard");
      router.refresh();
      return;
    }
    if (result.kind === "two_factor_required") {
      setStep({
        name: "two_factor",
        authToken: result.authToken,
        channel: identifier.channel,
        email: identifier.email,
        mobileNumber: identifier.mobileNumber,
        resendToken: result.resendToken,
        retryAfter: result.retryAfter,
        // Built here, not taken from the API: the backend says "your email"
        // whatever the channel. Masked and specific, matching the wording the
        // registration step uses so the two screens read the same.
        message:
          identifier.channel === "email"
            ? `We sent a 6-digit code to ${maskEmail(identifier.email)}.`
            : `We sent a 6-digit code to ${maskMobileNumber(identifier.mobileNumber)}.`,
      });
      otpForm.reset();
      return;
    }
    applyResultErrors(credentialsForm, result, ["email", "mobile_number", "password"]);
  }

  async function submitCredentials(values: LoginValues) {
    if (!captchaToken) {
      credentialsForm.setError("root", { message: CAPTCHA_REQUIRED_MESSAGE });
      return;
    }
    const captcha = captchaToken;
    turnstileRef.current?.reset();
    setCaptchaToken(null);
    const email = values.channel === "email" ? values.email : undefined;
    const mobileNumber = values.channel === "sms" ? `+63${values.mobile_number}` : undefined;
    const result = await authenticateClient({
      channel: values.channel,
      email,
      mobile_number: mobileNumber,
      password: values.password,
      captcha,
      deviceToken: getClientDeviceToken(),
    });
    await handleAuthResult(result, {
      channel: values.channel,
      email: email ?? "",
      mobileNumber: mobileNumber ?? "",
    });
  }

  async function submitOtp(values: TwoFactorValues, captcha: string) {
    if (step.name !== "two_factor") return;
    const result: ClientTwoFactorResult = await verifyTwoFactorClient({
      authToken: step.authToken,
      channel: step.channel,
      pin: values.pin,
      captcha,
    });
    if (result.kind === "authenticated") {
      const written = await writeClientSession({
        username: step.channel === "email" ? step.email : step.mobileNumber,
        accessToken: result.token,
      });
      if (!written.ok) {
        otpForm.setError("root", { message: written.message });
        return;
      }
      if (result.deviceToken) setClientDeviceToken(result.deviceToken);
      // Reset before navigating away. cacheComponents renders routes inside
      // React <Activity>, which HIDES this route rather than unmounting it, so
      // its state survives into a later visit to /login — the step (which
      // stranded users on the OTP screen after signing out and back in) and,
      // until now, the email and password too.
      setStep({ name: "credentials" });
      credentialsForm.reset();
      otpForm.reset();
      router.push("/dashboard");
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
        <Tabs
          value={channel}
          onValueChange={(value) => {
            credentialsForm.clearErrors();
            credentialsForm.setValue("channel", value as "email" | "sms");
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger value="email" className="flex-1">
              Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex-1">
              Mobile number
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {channel === "email" ? (
          <AppFormField label="Email" isRequired error={credentialsForm.formState.errors.email?.message}>
            <Input
              type="email"
              autoComplete="username"
              placeholder="Enter your email"
              className="h-11"
              {...credentialsForm.register("email")}
            />
          </AppFormField>
        ) : (
          <AppFormField
            label="Mobile number"
            isRequired
            error={credentialsForm.formState.errors.mobile_number?.message}
          >
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center gap-1.5 text-sm text-muted-foreground"
              >
                <span className="text-base leading-none">🇵🇭</span>+63
              </span>
              <Input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="9171234567"
                maxLength={10}
                className="h-11 pl-16"
                {...credentialsForm.register("mobile_number")}
              />
            </div>
          </AppFormField>
        )}
        <div>
          <AppFormField
            label="Password"
            isRequired
            error={credentialsForm.formState.errors.password?.message}
          >
            <PasswordInput
              autoComplete="current-password"
              placeholder="Enter your password"
              className="h-11"
              {...credentialsForm.register("password")}
            />
          </AppFormField>
          <div className="mt-2 flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>
        <TurnstileField
          ref={turnstileRef}
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken(null)}
        />
        <FormRootError />
        <FormSubmitButton className="h-11 w-full text-[0.95rem]" disabled={!captchaToken}>
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
