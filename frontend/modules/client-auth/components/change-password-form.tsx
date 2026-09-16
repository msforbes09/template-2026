"use client";

import { useState } from "react";
import { useForm, useWatch, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { AppFormField } from "@/components/ui/app-form-field";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { FormRootError } from "@/components/ui/form-root-error";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { applyResultErrors } from "@/lib/apply-result-errors";
import { changeClientPassword } from "@/modules/client-auth/actions/password-actions";
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from "@/modules/client-auth/schemas/change-password-schema";

const FIELDS = ["current_password", "new_password", "new_password_confirmation"] as const;

export function ChangePasswordForm({
  email,
  onSuccess,
}: {
  email: string;
  // Lets a caller react to a successful change — the account menu uses it to
  // close its modal and toast. Omitted on the profile page, which shows the
  // inline success note below instead.
  onSuccess?: () => void;
}) {
  const [success, setSuccess] = useState(false);
  const form = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });
  // useWatch rather than form.watch(): it subscribes to this one field instead
  // of re-rendering the form on every keystroke in any of them.
  const newPassword = useWatch({ control: form.control, name: "new_password" }) ?? "";

  async function onSubmit(values: ChangePasswordValues) {
    setSuccess(false);
    const result = await changeClientPassword(email, values);
    if (result.ok) {
      form.reset();
      setSuccess(true);
      onSuccess?.();
      return;
    }
    applyResultErrors(form, result, FIELDS);
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
          label="Current password"
          isRequired
          error={form.formState.errors.current_password?.message}
        >
          <PasswordInput autoComplete="current-password" {...form.register("current_password")} />
        </AppFormField>
        <div className="space-y-2">
          <AppFormField
            label="New password"
            isRequired
            error={form.formState.errors.new_password?.message}
          >
            <PasswordInput autoComplete="new-password" {...form.register("new_password")} />
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
            {...form.register("new_password_confirmation")}
          />
        </AppFormField>
        {success && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2 aria-hidden className="size-4" />
            Password updated.
          </p>
        )}
        <FormRootError />
        <FormSubmitButton>Update password</FormSubmitButton>
      </form>
    </FormProvider>
  );
}
