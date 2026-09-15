"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, FormProvider } from "react-hook-form";
import { applyResultErrors } from "@/lib/apply-result-errors";
import { useResetOnHide } from "@/hooks/use-reset-on-hide";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { Button } from "@/components/ui/button";
import { AppFormField } from "@/components/ui/app-form-field";
import { FormRootError } from "@/components/ui/form-root-error";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { OtpField } from "@/components/ui/otp-field";
import { TurnstileField } from "@/components/ui/turnstile-field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@/modules/client-auth/schemas/forgot-password-schema";
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "@/modules/client-auth/schemas/reset-password-schema";
import {
  forgotPasswordClient,
  resetPasswordClient,
  type ResetPasswordResult,
} from "@/modules/client-auth/lib/client-auth-client";
import { resendOtp } from "@/lib/otp-client";
import { writeClientSession } from "@/modules/client-auth/actions/session-actions";

const CAPTCHA_REQUIRED_MESSAGE = "Please complete the verification and try again.";

type Step =
  | { name: "request" }
  | {
      name: "reset";
      channel: "email" | "sms";
      email: string;
      mobileNumber: string;
      resendToken: string;
      retryAfter: number;
      message: string;
    };

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>({ name: "request" });

  const requestForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { channel: "email", email: "", mobile_number: "" },
  });
  const channel = requestForm.watch("channel");
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
    setStep({ name: "request" });
    requestForm.reset();
  });

  async function submitRequest(values: ForgotPasswordValues) {
    if (!captchaToken) {
      requestForm.setError("root", { message: CAPTCHA_REQUIRED_MESSAGE });
      return;
    }
    const captcha = captchaToken;
    turnstileRef.current?.reset();
    setCaptchaToken(null);
    const email = values.channel === "email" ? values.email : undefined;
    const mobileNumber = values.channel === "sms" ? `+63${values.mobile_number}` : undefined;
    const result = await forgotPasswordClient({
      channel: values.channel,
      email,
      mobile_number: mobileNumber,
      captcha,
    });
    if (result.kind === "sent") {
      setStep({
        name: "reset",
        channel: values.channel,
        email: email ?? "",
        mobileNumber: mobileNumber ?? "",
        resendToken: result.resendToken,
        retryAfter: result.retryAfter,
        message: `If ${email ?? mobileNumber} has an account, we sent a 6-digit code to it.`,
      });
      return;
    }
    applyResultErrors(requestForm, result, ["email", "mobile_number"]);
  }

  if (step.name === "reset") {
    return (
      <ResetStep
        channel={step.channel}
        email={step.email}
        mobileNumber={step.mobileNumber}
        message={step.message}
        retryAfter={step.retryAfter}
        resendToken={step.resendToken}
        // Rolls the wizard back AND empties step one. The child cannot reach
          // requestForm, so the reset has to happen here.
          onBack={() => {
            setStep({ name: "request" });
            requestForm.reset();
          }}
      />
    );
  }

  return (
    <FormProvider {...requestForm}>
      <form
        onSubmit={(event) => {
          void requestForm.handleSubmit(submitRequest)(event);
        }}
        className="space-y-5"
        noValidate
      >
        <Tabs
          value={channel}
          onValueChange={(value) => {
            requestForm.clearErrors();
            requestForm.setValue("channel", value as "email" | "sms");
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
          <AppFormField label="Email" isRequired error={requestForm.formState.errors.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              className="h-11"
              {...requestForm.register("email")}
            />
          </AppFormField>
        ) : (
          <AppFormField
            label="Mobile number"
            isRequired
            error={requestForm.formState.errors.mobile_number?.message}
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
                {...requestForm.register("mobile_number")}
              />
            </div>
          </AppFormField>
        )}
        <TurnstileField
          ref={turnstileRef}
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken(null)}
        />
        <FormRootError />
        <FormSubmitButton className="h-10 w-full" disabled={!captchaToken}>
          Send reset code
        </FormSubmitButton>
      </form>
    </FormProvider>
  );
}

function ResetStep({
  channel,
  email,
  mobileNumber,
  message,
  retryAfter,
  resendToken: initialResendToken,
  onBack,
}: {
  channel: "email" | "sms";
  email: string;
  mobileNumber: string;
  message: string;
  retryAfter: number;
  resendToken: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const form = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });
  // useWatch rather than form.watch(): it subscribes to this one field instead
  // of re-rendering the step on every keystroke in any of them.
  const newPassword = useWatch({ control: form.control, name: "new_password" }) ?? "";

  const [cooldown, setCooldown] = useState(retryAfter);
  const [resending, setResending] = useState(false);
  const [resendToken, setResendToken] = useState(initialResendToken);
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

  async function handleSubmit(values: ResetPasswordValues) {
    if (!captchaToken) {
      form.setError("root", { message: CAPTCHA_REQUIRED_MESSAGE });
      return;
    }
    const captcha = captchaToken;
    turnstileRef.current?.reset();
    setCaptchaToken(null);
    const result: ResetPasswordResult = await resetPasswordClient({
      channel,
      email: channel === "email" ? email : undefined,
      mobile_number: channel === "sms" ? mobileNumber : undefined,
      ...values,
      captcha,
    });
    if (result.kind === "authenticated") {
      const written = await writeClientSession({
        username: channel === "email" ? email : mobileNumber,
        accessToken: result.token,
      });
      if (!written.ok) {
        form.setError("root", { message: written.message });
        return;
      }
      // Reset before navigating away — Next.js caches this static page's
      // client tree for revisits (see prefetching.md's 5-min static client
      // cache), so whatever step this wizard is left at here is what a later
      // visit to /forgot-password shows first, even after signing out.
      onBack();
      router.push("/dashboard");
      router.refresh();
      return;
    }
    const message =
      result.remainingAttempts !== undefined
        ? `${result.message} (${result.remainingAttempts} attempt(s) remaining.)`
        : result.message;
    applyResultErrors(form, { ...result, message }, [
      "otp",
      "new_password",
      "new_password_confirmation",
    ]);
  }

  async function handleResend() {
    if (!captchaToken) {
      form.setError("root", { message: CAPTCHA_REQUIRED_MESSAGE });
      return;
    }
    const captcha = captchaToken;
    turnstileRef.current?.reset();
    setCaptchaToken(null);
    setResending(true);
    try {
      const result = await resendOtp({ resendToken, captcha });
      if (result.kind === "sent") {
        setResendToken(result.resendToken);
        setCooldown(result.retryAfter);
      } else if (result.kind === "throttled") {
        setCooldown(result.retryAfter);
        form.setError("root", { message: result.message });
      } else {
        form.setError("root", { message: result.message });
      }
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
        <AppFormField label="Verification code" isRequired error={form.formState.errors.otp?.message}>
          <OtpField control={form.control} name="otp" length={6} />
        </AppFormField>
        <div className="space-y-2">
          <AppFormField
            label="New password"
            isRequired
            error={form.formState.errors.new_password?.message}
          >
            <PasswordInput
              autoComplete="new-password"
              placeholder="Enter your new password"
              className="h-11"
              {...form.register("new_password")}
            />
          </AppFormField>
          <PasswordStrength value={newPassword} />
        </div>
        <AppFormField
          label="Confirm new password"
          isRequired
          error={form.formState.errors.new_password_confirmation?.message}
        >
          <PasswordInput
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            className="h-11"
            {...form.register("new_password_confirmation")}
          />
        </AppFormField>
        <FormRootError />
        <FormSubmitButton className="h-10 w-full">Reset password</FormSubmitButton>
        <p className="text-center text-xs text-muted-foreground">
          Complete the verification below, then resend the code if it expired.
        </p>
        <TurnstileField
          ref={turnstileRef}
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken(null)}
        />
        <div className="flex items-center justify-between gap-4 text-sm">
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-muted-foreground"
            onClick={onBack}
          >
            Back
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
