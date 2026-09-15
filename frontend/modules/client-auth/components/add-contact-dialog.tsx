"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppFormField } from "@/components/ui/app-form-field";
import { FormRootError } from "@/components/ui/form-root-error";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { OtpField } from "@/components/ui/otp-field";
import { applyResultErrors } from "@/lib/apply-result-errors";
import { resendOtp } from "@/lib/otp-client";
import {
  addContactEmailSchema,
  addContactMobileSchema,
  type AddContactEmailValues,
  type AddContactMobileValues,
} from "@/modules/client-auth/schemas/add-contact-schema";
import {
  verifyContactSchema,
  type VerifyContactValues,
} from "@/modules/client-auth/schemas/verify-contact-schema";
import { addContact, verifyContact } from "@/modules/client-auth/actions/profile-actions";

type Step =
  | { name: "add" }
  | { name: "verify"; identifier: string; resendToken: string; retryAfter: number };

export function AddContactDialog({ channel }: { channel: "email" | "sms" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>({ name: "add" });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setStep({ name: "add" });
  }

  function handleAlreadySet() {
    setOpen(false);
    setStep({ name: "add" });
    router.refresh();
  }

  function handleVerified() {
    setOpen(false);
    setStep({ name: "add" });
    router.refresh();
    toast.success(channel === "email" ? "Email added and verified." : "Mobile number added and verified.");
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Plus aria-hidden className="size-3.5" />
        {channel === "email" ? "Add email" : "Add mobile number"}
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{channel === "email" ? "Add your email" : "Add your mobile number"}</DialogTitle>
            <DialogDescription>
              We&apos;ll send a 6-digit code to verify it before adding it to your account.
            </DialogDescription>
          </DialogHeader>
          {step.name === "add" ? (
            channel === "email" ? (
              <AddEmailStep onSent={setStep} onAlreadySet={handleAlreadySet} />
            ) : (
              <AddMobileStep onSent={setStep} onAlreadySet={handleAlreadySet} />
            )
          ) : (
            <VerifyStep
              channel={channel}
              identifier={step.identifier}
              resendToken={step.resendToken}
              retryAfter={step.retryAfter}
              onVerified={handleVerified}
              onAlreadySet={handleAlreadySet}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddEmailStep({
  onSent,
  onAlreadySet,
}: {
  onSent: (step: Step) => void;
  onAlreadySet: () => void;
}) {
  const form = useForm<AddContactEmailValues>({ resolver: zodResolver(addContactEmailSchema) });

  async function onSubmit(values: AddContactEmailValues) {
    const result = await addContact({ channel: "email", email: values.email });
    if (result.ok) {
      onSent({
        name: "verify",
        identifier: values.email,
        resendToken: result.data.resend_token,
        retryAfter: result.data.retry_after,
      });
      return;
    }
    if (result.status === 400) {
      // The only documented 400 here is contact_already_set — no per-field
      // fix is possible, so treat it as an informational outcome rather
      // than a form error.
      toast.info("This email is already set on your account.");
      onAlreadySet();
      return;
    }
    applyResultErrors(form, result, ["email"]);
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={(event) => {
          void form.handleSubmit(onSubmit)(event);
        }}
        className="space-y-5"
        noValidate
      >
        <AppFormField label="Email" isRequired error={form.formState.errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-11"
            {...form.register("email")}
          />
        </AppFormField>
        <FormRootError />
        <FormSubmitButton className="h-10 w-full">Send code</FormSubmitButton>
      </form>
    </FormProvider>
  );
}

function AddMobileStep({
  onSent,
  onAlreadySet,
}: {
  onSent: (step: Step) => void;
  onAlreadySet: () => void;
}) {
  const form = useForm<AddContactMobileValues>({ resolver: zodResolver(addContactMobileSchema) });

  async function onSubmit(values: AddContactMobileValues) {
    const mobileNumber = `+63${values.mobile_number}`;
    const result = await addContact({ channel: "sms", mobile_number: mobileNumber });
    if (result.ok) {
      onSent({
        name: "verify",
        identifier: mobileNumber,
        resendToken: result.data.resend_token,
        retryAfter: result.data.retry_after,
      });
      return;
    }
    if (result.status === 400) {
      toast.info("This mobile number is already set on your account.");
      onAlreadySet();
      return;
    }
    applyResultErrors(form, result, ["mobile_number"]);
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={(event) => {
          void form.handleSubmit(onSubmit)(event);
        }}
        className="space-y-5"
        noValidate
      >
        <AppFormField
          label="Mobile number"
          isRequired
          error={form.formState.errors.mobile_number?.message}
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
              {...form.register("mobile_number")}
            />
          </div>
        </AppFormField>
        <FormRootError />
        <FormSubmitButton className="h-10 w-full">Send code</FormSubmitButton>
      </form>
    </FormProvider>
  );
}

function VerifyStep({
  channel,
  identifier,
  resendToken: initialResendToken,
  retryAfter,
  onVerified,
  onAlreadySet,
}: {
  channel: "email" | "sms";
  identifier: string;
  resendToken: string;
  retryAfter: number;
  onVerified: () => void;
  onAlreadySet: () => void;
}) {
  const form = useForm<VerifyContactValues>({ resolver: zodResolver(verifyContactSchema) });
  const [cooldown, setCooldown] = useState(retryAfter);
  const [resending, setResending] = useState(false);
  const [resendToken, setResendToken] = useState(initialResendToken);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((current) => current - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function onSubmit(values: VerifyContactValues) {
    const result = await verifyContact({
      channel,
      email: channel === "email" ? identifier : undefined,
      mobile_number: channel === "sms" ? identifier : undefined,
      otp: values.otp,
    });
    if (result.ok) {
      onVerified();
      return;
    }
    if (result.status === 400 && result.remainingAttempts === undefined) {
      // contact_already_set raced in between add and verify (e.g. two tabs).
      toast.info(
        channel === "email"
          ? "This email is already set on your account."
          : "This mobile number is already set on your account.",
      );
      onAlreadySet();
      return;
    }
    const message =
      result.remainingAttempts !== undefined
        ? `${result.message} (${result.remainingAttempts} attempt(s) remaining.)`
        : result.message;
    applyResultErrors(form, { ...result, message }, ["otp"]);
  }

  async function handleResend() {
    setResending(true);
    try {
      const result = await resendOtp({ resendToken });
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
          void form.handleSubmit(onSubmit)(event);
        }}
        className="space-y-5"
        noValidate
      >
        <p role="status" className="text-sm leading-relaxed text-muted-foreground">
          We sent a 6-digit code to {identifier}.
        </p>
        <AppFormField label="Verification code" isRequired error={form.formState.errors.otp?.message}>
          <OtpField control={form.control} name="otp" length={6} />
        </AppFormField>
        <FormRootError />
        <FormSubmitButton className="h-10 w-full">Verify</FormSubmitButton>
        <div className="flex justify-end text-sm">
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            disabled={cooldown > 0 || resending}
            onClick={() => void handleResend()}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
