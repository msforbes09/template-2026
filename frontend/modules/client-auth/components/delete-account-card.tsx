"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PasswordInput } from "@/components/ui/password-input";
import { applyResultErrors } from "@/lib/apply-result-errors";
import { deleteClientAccount } from "@/modules/client-auth/actions/delete-account-actions";
import {
  deleteAccountSchema,
  type DeleteAccountValues,
} from "@/modules/client-auth/schemas/delete-account-schema";

// Self-service account deletion.
//
// Two gates, because this cannot be undone from the UI: an explicit dialog, and
// the account password typed into it. The password is not a formality — it is
// the re-authentication the backend requires, so there is no version of this
// flow where a single stray click destroys an account.

const FIELDS = ["password"] as const;

export function DeleteAccountCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<DeleteAccountValues>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { password: "" },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Never leave a typed password sitting in a closed dialog's state.
    if (!next) form.reset();
  }

  async function onSubmit(values: DeleteAccountValues) {
    const result = await deleteClientAccount(values);
    if (!result.ok) {
      applyResultErrors(form, result, FIELDS);
      return;
    }

    // The session is already gone, both here and on the backend. Push to the
    // landing page and refresh so the server re-renders the whole shell as
    // signed-out — without the refresh the header would keep showing an
    // account menu for a session that no longer exists.
    setOpen(false);
    toast.success("Your account has been deleted.");
    router.push("/");
    router.refresh();
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle aria-hidden className="size-4" />
          Delete account
        </CardTitle>
        <CardDescription>
          Permanently closes your account and signs you out everywhere. Your API
          credentials stop working immediately.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
          onClick={() => setOpen(true)}
        >
          <Trash2 aria-hidden className="size-4" />
          Delete my account
        </Button>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This cannot be undone. Your API credentials stop working immediately
                and you will be signed out everywhere.
              </DialogDescription>
            </DialogHeader>

            {/* Outside DialogDescription, which renders a <p> — paragraphs can't
                nest. Kept as prose rather than trimmed away: "you can register
                again" is the question people actually have, and the audit line
                is what makes "deleted" honest. */}
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                You can register again later with the same email,
                but it creates a <strong className="font-medium">new</strong>{" "}
                account — nothing from this one carries over.
              </p>
              <p>
                A minimal record is kept for audit purposes, as required for
                government services.
              </p>
            </div>

            <FormProvider {...form}>
              <form
                onSubmit={(event) => {
                  void form.handleSubmit(onSubmit)(event);
                }}
                className="space-y-4"
                noValidate
              >
                <AppFormField
                  label="Confirm your password"
                  isRequired
                  userInfo="We ask for your password to make sure it's you."
                  error={form.formState.errors.password?.message}
                >
                  <PasswordInput
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    {...form.register("password")}
                  />
                </AppFormField>

                <FormRootError />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleOpenChange(false)}
                    disabled={form.formState.isSubmitting}
                  >
                    Cancel
                  </Button>
                  <FormSubmitButton className="bg-destructive text-white hover:bg-destructive/90">
                    Delete my account
                  </FormSubmitButton>
                </div>
              </form>
            </FormProvider>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
