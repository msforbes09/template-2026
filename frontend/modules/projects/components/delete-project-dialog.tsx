"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { deleteProject } from "@/modules/projects/actions/client-project-actions";
import { deleteAdminProject } from "@/modules/projects/actions/admin-project-actions";
import {
  deleteProjectSchema,
  type DeleteProjectValues,
} from "@/modules/projects/schemas/delete-project-schema";

const FIELDS = ["password"] as const;

// Used from both the citizen detail page and the admin review screen — same
// button, different action and different place to land afterwards.
//
// The two audiences differ in one way that matters: the citizen endpoint takes
// the account password (`DeleteProjectRequest`, `current_password:users`) and
// the admin one does not, so only the citizen gets the form. Adding a password
// field to the admin path would collect something nothing verifies, which is
// worse than no gate because it looks like one.
export function DeleteProjectDialog({
  uuid,
  name,
  isLive,
  audience = "client",
}: {
  uuid: string;
  name: string;
  isLive: boolean;
  audience?: "client" | "admin";
}) {
  const router = useRouter();
  const listPath = audience === "admin" ? "/admin/projects" : "/dashboard/projects";

  const consequence = isLive
    ? `${name} is live on the public showcase. Deleting it removes it from there too, and this can't be undone.`
    : `${name} will be removed. This can't be undone.`;

  if (audience === "admin") {
    return (
      <ConfirmDialog
        trigger={
          <Button variant="outline" className="gap-1.5 text-destructive">
            <Trash2 aria-hidden className="size-4" />
            Delete
          </Button>
        }
        title="Delete this project?"
        description={consequence}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          const result = await deleteAdminProject(uuid);
          if (result.ok) {
            toast.success("Project deleted");
            router.push(listPath);
          } else {
            toast.error(result.message);
          }
        }}
      />
    );
  }

  return <DeleteOwnProjectDialog uuid={uuid} consequence={consequence} />;
}

function DeleteOwnProjectDialog({
  uuid,
  consequence,
}: {
  uuid: string;
  consequence: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<DeleteProjectValues>({
    resolver: zodResolver(deleteProjectSchema),
    defaultValues: { password: "" },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Never leave a typed password sitting in a closed dialog's state.
    if (!next) form.reset();
  }

  async function onSubmit(values: DeleteProjectValues) {
    const result = await deleteProject(uuid, values);
    if (!result.ok) {
      // A wrong password comes back as 422 on `password`, so it belongs under
      // the field. Anything else (a claim lock, say) lands on the root.
      applyResultErrors(form, result, FIELDS);
      return;
    }

    setOpen(false);
    toast.success("Project deleted");
    router.push("/dashboard/projects");
  }

  return (
    <>
      <Button
        variant="outline"
        className="gap-1.5 text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 aria-hidden className="size-4" />
        Delete
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this project?</DialogTitle>
            <DialogDescription>{consequence}</DialogDescription>
          </DialogHeader>

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
                userInfo="We ask for your password because this can't be undone."
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
                  Delete project
                </FormSubmitButton>
              </div>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>
    </>
  );
}
