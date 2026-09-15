"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppFormField } from "@/components/ui/app-form-field";
import { FormRootError } from "@/components/ui/form-root-error";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { OtpField } from "@/components/ui/otp-field";
import { applyResultErrors } from "@/lib/apply-result-errors";
import {
  activationCodeSchema,
  type ActivationCodeValues,
} from "@/modules/site/schemas/activation-code-schema";
import type { ActionResult } from "@/lib/action-result";
import type { ClientUserProfile } from "@/types/client-user";

// Manual fallback for users who can't scan the admin QR — types the 8-digit
// code shown beside it instead. onActivate does the actual POST /activate
// (and any success side effects, e.g. toasts/credential generation) and
// hands back the ActionResult so field/root errors can be mapped onto this
// form the same way the eGovPH SSO wizard does for its OTP/PIN steps.
export function ActivationCodeForm({
  onActivate,
}: {
  onActivate: (code: string) => Promise<ActionResult<ClientUserProfile>>;
}) {
  const form = useForm<ActivationCodeValues>({
    resolver: zodResolver(activationCodeSchema),
    defaultValues: { activation_code: "" },
  });

  async function submit(values: ActivationCodeValues) {
    const result = await onActivate(values.activation_code);
    if (!result.ok) {
      applyResultErrors(form, result, ["activation_code"]);
    }
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={(event) => {
          void form.handleSubmit(submit)(event);
        }}
        className="space-y-4"
        noValidate
      >
        <AppFormField
          label="Activation code"
          isRequired
          userInfo="Enter the 8-digit code shown beside the QR on the kiosk screen."
          error={form.formState.errors.activation_code?.message}
        >
          <OtpField control={form.control} name="activation_code" length={8} />
        </AppFormField>
        <FormRootError />
        <FormSubmitButton className="h-11 w-full">Activate account</FormSubmitButton>
      </form>
    </FormProvider>
  );
}
