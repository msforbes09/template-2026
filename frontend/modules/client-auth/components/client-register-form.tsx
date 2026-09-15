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
import { Stepper } from "@/components/ui/stepper";
import { REGISTRATION_STEPS } from "@/modules/client-auth/lib/registration-steps";
import { registerSchema, type RegisterValues } from "@/modules/client-auth/schemas/register-schema";
import {
  verifyRegistrationSchema,
  type VerifyRegistrationValues,
} from "@/modules/client-auth/schemas/verify-registration-schema";
import {
  registerClient,
  verifyRegistrationClient,
  type VerifyRegistrationResult,
} from "@/modules/client-auth/lib/client-auth-client";
import { maskEmail, maskMobileNumber } from "@/lib/mask-identifier";
import { resendOtp } from "@/lib/otp-client";
import { writeClientSession } from "@/modules/client-auth/actions/session-actions";

const CAPTCHA_REQUIRED_MESSAGE = "Please complete the verification and try again.";

type Step =
  | { name: "register" }
  | {
      name: "verify";
      channel: "email" | "sms";
      email: string;
      mobileNumber: string;
      resendToken: string;
      retryAfter: number;
      message: string;
    };

export function ClientRegisterForm() {
  const [step, setStep] = useState<Step>({ name: "register" });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      channel: "email",
      email: "",
      mobile_number: "",
      company_name: "",
      first_name: "",
      last_name: "",
    },
  });
  const channel = registerForm.watch("channel");
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
    setStep({ name: "register" });
    registerForm.reset();
  });

  async function submitRegister(values: RegisterValues) {
    if (!captchaToken) {
      registerForm.setError("root", { message: CAPTCHA_REQUIRED_MESSAGE });
      return;
    }
    const captcha = captchaToken;
    turnstileRef.current?.reset();
    setCaptchaToken(null);
    const email = values.channel === "email" ? values.email : undefined;
    const mobileNumber = values.channel === "sms" ? `+63${values.mobile_number}` : undefined;
    const result = await registerClient({
      channel: values.channel,
      email,
      mobile_number: mobileNumber,
      company_name: values.company_name,
      first_name: values.first_name,
      last_name: values.last_name,
      captcha,
    });
    if (result.kind === "sent") {
      setStep({
        name: "verify",
        channel: values.channel,
        email: email ?? "",
        mobileNumber: mobileNumber ?? "",
        resendToken: result.resendToken,
        retryAfter: result.retryAfter,
        message: `We sent a 6-digit code to ${email ? maskEmail(email) : maskMobileNumber(mobileNumber ?? "")}.`,
      });
      return;
    }
    applyResultErrors(registerForm, result, [
      "email",
      "mobile_number",
      "company_name",
      "first_name",
      "last_name",
    ]);
  }

  return (
    <div className="space-y-8">
      <Stepper steps={REGISTRATION_STEPS} current={step.name === "verify" ? "verify" : "account"} />
      {step.name === "verify" ? (
        <VerifyStep
          channel={step.channel}
          email={step.email}
          mobileNumber={step.mobileNumber}
          message={step.message}
          retryAfter={step.retryAfter}
          resendToken={step.resendToken}
          // Rolls the wizard back AND empties step one. The child cannot reach
          // registerForm, so the reset has to happen here.
          onBack={() => {
            setStep({ name: "register" });
            registerForm.reset();
          }}
        />
      ) : (
        <FormProvider {...registerForm}>
          <form
            onSubmit={(event) => {
              void registerForm.handleSubmit(submitRegister)(event);
            }}
            className="space-y-5"
            noValidate
          >
            <Tabs
              value={channel}
              onValueChange={(value) => {
                registerForm.clearErrors();
                registerForm.setValue("channel", value as "email" | "sms");
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
              <AppFormField
                label="Email"
                isRequired
                error={registerForm.formState.errors.email?.message}
              >
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  className="h-11"
                  {...registerForm.register("email")}
                />
              </AppFormField>
            ) : (
              <AppFormField
                label="Mobile number"
                isRequired
                error={registerForm.formState.errors.mobile_number?.message}
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
                    {...registerForm.register("mobile_number")}
                  />
                </div>
              </AppFormField>
            )}
            <AppFormField
              label="Company name"
              isRequired
              error={registerForm.formState.errors.company_name?.message}
            >
              <Input
                autoComplete="organization"
                placeholder="Enter your company name"
                className="h-11"
                {...registerForm.register("company_name")}
              />
            </AppFormField>
            <AppFormField
              label="First name"
              isRequired
              error={registerForm.formState.errors.first_name?.message}
            >
              <Input
                autoComplete="given-name"
                placeholder="Enter your first name"
                className="h-11"
                {...registerForm.register("first_name")}
              />
            </AppFormField>
            <AppFormField
              label="Last name"
              isRequired
              error={registerForm.formState.errors.last_name?.message}
            >
              <Input
                autoComplete="family-name"
                placeholder="Enter your last name"
                className="h-11"
                {...registerForm.register("last_name")}
              />
            </AppFormField>
            <TurnstileField
              ref={turnstileRef}
              onVerify={setCaptchaToken}
              onExpire={() => setCaptchaToken(null)}
            />
            <FormRootError />
            <FormSubmitButton className="h-10 w-full" disabled={!captchaToken}>
              Continue
            </FormSubmitButton>
          </form>
        </FormProvider>
      )}
    </div>
  );
}

function VerifyStep({
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
  const form = useForm<VerifyRegistrationValues>({ resolver: zodResolver(verifyRegistrationSchema) });
  // useWatch rather than form.watch(): it subscribes to this one field instead
  // of re-rendering the whole step on every keystroke in any of them.
  const newPassword = useWatch({ control: form.control, name: "password" }) ?? "";

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

  async function handleSubmit(values: VerifyRegistrationValues) {
    const result: VerifyRegistrationResult = await verifyRegistrationClient({
      channel,
      email: channel === "email" ? email : undefined,
      mobile_number: channel === "sms" ? mobileNumber : undefined,
      ...values,
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
      // Reset before navigating away. cacheComponents renders routes inside
      // React <Activity>, which HIDES this route rather than unmounting it, so
      // everything here survives into a later visit to /register — the wizard
      // step and, until now, the name, company and email typed into step one.
      onBack();
      // The ?registered=1 marker survives the entire draft -> for_assessment
      // journey unchanged (CompleteProfileWizard/SubmitForAssessmentStep
      // never navigate away from /dashboard, just router.refresh() in
      // place) — it's what lets DashboardGuard show the one-time missing-
      // contact nudge on the first real (non-wizard) dashboard render.
      router.push("/dashboard?registered=1");
      router.refresh();
      return;
    }
    const message =
      result.remainingAttempts !== undefined
        ? `${result.message} (${result.remainingAttempts} attempt(s) remaining.)`
        : result.message;
    applyResultErrors(form, { ...result, message }, ["otp", "password", "password_confirmation"]);
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
        <div className="space-y-3">
          <AppFormField
            label="Verification code"
            isRequired
            error={form.formState.errors.otp?.message}
          >
            <OtpField control={form.control} name="otp" length={6} />
          </AppFormField>
          <p className="text-center text-sm text-muted-foreground">
            Didn&apos;t get the code?{" "}
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-sm tabular-nums disabled:text-muted-foreground disabled:opacity-100"
              disabled={cooldown > 0 || resending || !captchaToken}
              onClick={handleResend}
            >
              {resending
                ? "Sending..."
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend"}
            </Button>
          </p>
        </div>
        <div className="space-y-2">
          <AppFormField
            label="Password"
            isRequired
            error={form.formState.errors.password?.message}
          >
            <PasswordInput
              autoComplete="new-password"
              placeholder="Enter your password"
              className="h-11"
              {...form.register("password")}
            />
          </AppFormField>
          <PasswordStrength value={newPassword} />
        </div>
        <AppFormField
          label="Confirm password"
          isRequired
          error={form.formState.errors.password_confirmation?.message}
        >
          <PasswordInput
            autoComplete="new-password"
            placeholder="Re-enter your password"
            className="h-11"
            {...form.register("password_confirmation")}
          />
        </AppFormField>
        <FormRootError />
        <FormSubmitButton className="h-10 w-full">Create account</FormSubmitButton>
        <p className="text-center text-xs text-muted-foreground">
          Complete the verification below, then resend the code if it expired.
        </p>
        <TurnstileField
          ref={turnstileRef}
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken(null)}
        />
        <div className="text-sm">
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-muted-foreground"
            onClick={onBack}
          >
            Back
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
