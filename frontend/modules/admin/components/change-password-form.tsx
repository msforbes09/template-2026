"use client";

import { useForm, useWatch, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AppFormField } from "@/components/ui/app-form-field";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { FormRootError } from "@/components/ui/form-root-error";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { applyResultErrors } from "@/lib/apply-result-errors";
import { useResetOnHide } from "@/hooks/use-reset-on-hide";
import { changeAdminPassword } from "@/modules/admin/actions/change-password";
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from "@/modules/admin/schemas/change-password-schema";

const FIELDS = ["current_password", "new_password", "new_password_confirmation"] as const;

// Every successful change ENDS THE SESSION. The backend revokes all of this
// administrator's tokens (see changeAdminPassword), so there is no version of
// this that leaves them usefully signed in — the choice is only whether they
// find out here or at the next 401. All three callers get the same treatment
// for that reason, not just the forced temporary-password modal.
//
// `onSuccess` is still called first, for whatever the caller has to tidy up
// (closing its dialog) before the redirect unmounts it.
export function ChangePasswordForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const form = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  // This form renders on the /admin/settings PAGE as well as in two modals. A
  // modal unmounts on close and clears itself; the page does not — navigation
  // only hides it — so a half-typed old and new password would still be here on
  // the next visit without this.
  useResetOnHide(() => form.reset());
  // useWatch rather than form.watch(): it subscribes to this one field instead
  // of re-rendering the form on every keystroke in any of them.
  const newPassword = useWatch({ control: form.control, name: "new_password" }) ?? "";

  async function onSubmit(values: ChangePasswordValues) {
    const result = await changeAdminPassword(values);
    if (result.ok) {
      form.reset();
      onSuccess?.();
      // Toasted rather than shown inline: the inline confirmation would be
      // painted and navigated away from in the same breath. Sonner lives in the
      // root layout, so it survives the client navigation and is still on
      // screen when the login form arrives.
      toast.success("Password updated. Please sign in with your new password.");
      // A FULL PAGE LOAD: the action above cleared the session, so this is a
      // sign-out in all but name. cacheComponents keeps recently visited routes
      // mounted-but-hidden via React <Activity>, and router.replace/refresh
      // leaves that state intact — a soft navigation here would carry the old
      // password fields to the login page.
      window.location.href = "/admin/login";
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
        className="mt-4 max-w-sm space-y-5"
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
        <FormRootError />
        <FormSubmitButton>Update password</FormSubmitButton>
      </form>
    </FormProvider>
  );
}
