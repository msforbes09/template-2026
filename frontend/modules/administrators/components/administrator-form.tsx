"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { AppFormField } from "@/components/ui/app-form-field";
import { FormRootError } from "@/components/ui/form-root-error";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { FileUploader } from "@/modules/uploads/components/file-uploader";
import { applyResultErrors } from "@/lib/apply-result-errors";
import {
  administratorSchema,
  type AdministratorValues,
} from "@/modules/administrators/schemas/administrator-schema";
import type { ActionResult } from "@/lib/action-result";
import type { Administrator } from "@/types/administrator";
import type { UploadedFile } from "@/types/upload";

const FIELDS = ["email", "first_name", "last_name", "photo_uuid"] as const;

export function AdministratorForm({
  defaultValues,
  defaultPhoto = null,
  onSubmit,
  onSuccess,
  submitLabel,
}: {
  defaultValues?: Partial<AdministratorValues>;
  // Seeds the uploader's preview (uuid + url + name) in edit mode — RHF's
  // defaultValues only carries the flat photo_uuid string the form submits.
  defaultPhoto?: UploadedFile | null;
  onSubmit: (values: AdministratorValues) => Promise<ActionResult<Administrator>>;
  onSuccess: (data: Administrator) => void;
  submitLabel: string;
}) {
  const form = useForm<AdministratorValues>({
    resolver: zodResolver(administratorSchema),
    defaultValues,
  });
  const [photo, setPhoto] = useState<UploadedFile | null>(defaultPhoto);

  function handlePhotoChange(file: UploadedFile | null) {
    setPhoto(file);
    form.setValue("photo_uuid", file?.uuid ?? "", { shouldValidate: true, shouldDirty: true });
  }

  async function handleSubmit(values: AdministratorValues) {
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
        <AppFormField label="Email" isRequired error={form.formState.errors.email?.message}>
          <Input type="email" autoComplete="email" {...form.register("email")} />
        </AppFormField>
        <div className="grid grid-cols-2 gap-4">
          <AppFormField
            label="First name"
            isRequired
            error={form.formState.errors.first_name?.message}
          >
            <Input autoComplete="given-name" {...form.register("first_name")} />
          </AppFormField>
          <AppFormField
            label="Last name"
            isRequired
            error={form.formState.errors.last_name?.message}
          >
            <Input autoComplete="family-name" {...form.register("last_name")} />
          </AppFormField>
        </div>
        <AppFormField
          label="Photo"
          isRequired
          userInfo="Uploaded privately; only visible to signed-in staff."
          error={form.formState.errors.photo_uuid?.message}
        >
          <FileUploader visibility="private" accept="image/*" value={photo} onChange={handlePhotoChange} />
        </AppFormField>
        <FormRootError />
        <FormSubmitButton className="w-full">{submitLabel}</FormSubmitButton>
      </form>
    </FormProvider>
  );
}
