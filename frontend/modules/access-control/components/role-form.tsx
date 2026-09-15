"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { AppFormField } from "@/components/ui/app-form-field";
import { FormRootError } from "@/components/ui/form-root-error";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { applyResultErrors } from "@/lib/apply-result-errors";
import { roleSchema, type RoleValues } from "@/modules/access-control/schemas/role-schema";
import type { ActionResult } from "@/lib/action-result";
import type { Role } from "@/types/access-control";

const FIELDS = ["name", "description"] as const;

export function RoleForm({
  defaultValues,
  onSubmit,
  onSuccess,
  submitLabel,
}: {
  defaultValues?: Partial<RoleValues>;
  onSubmit: (values: RoleValues) => Promise<ActionResult<Role>>;
  onSuccess: (data: Role) => void;
  submitLabel: string;
}) {
  const form = useForm<RoleValues>({
    resolver: zodResolver(roleSchema),
    defaultValues,
  });

  async function handleSubmit(values: RoleValues) {
    const result = await onSubmit(values);
    if (result.ok) {
      onSuccess(result.data);
      return;
    }
    applyResultErrors(form, result, FIELDS);
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
        <AppFormField label="Name" isRequired error={form.formState.errors.name?.message}>
          <Input placeholder="Content Editor" {...form.register("name")} />
        </AppFormField>
        <AppFormField
          label="Description"
          userInfo="Optional. Shown to other admins managing roles."
          error={form.formState.errors.description?.message}
        >
          <Input placeholder="Manages content" {...form.register("description")} />
        </AppFormField>
        <FormRootError />
        <FormSubmitButton className="w-full">{submitLabel}</FormSubmitButton>
      </form>
    </FormProvider>
  );
}
