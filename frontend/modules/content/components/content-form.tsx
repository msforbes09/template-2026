"use client";

import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { AppFormField } from "@/components/ui/app-form-field";
import { FormRootError } from "@/components/ui/form-root-error";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { applyResultErrors } from "@/lib/apply-result-errors";
import { contentSchema, type ContentValues } from "@/modules/content/schemas/content-schema";
import type { ActionResult } from "@/lib/action-result";
import type { Content } from "@/types/content";

const FIELDS = ["identifier", "title", "body"] as const;

export function ContentForm({
  defaultValues,
  onSubmit,
  onSuccess,
  submitLabel,
}: {
  defaultValues?: Partial<ContentValues>;
  onSubmit: (values: ContentValues) => Promise<ActionResult<Content>>;
  onSuccess: (data: Content) => void;
  submitLabel: string;
}) {
  const form = useForm<ContentValues>({
    resolver: zodResolver(contentSchema),
    defaultValues,
  });

  async function handleSubmit(values: ContentValues) {
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
        <AppFormField
          label="Identifier"
          isRequired
          userInfo="Lowercase letters, numbers, dashes, and underscores only. Used to reference this block."
          error={form.formState.errors.identifier?.message}
        >
          <Input placeholder="terms-of-service" {...form.register("identifier")} />
        </AppFormField>
        <AppFormField
          label="Title"
          userInfo="Optional. Stored in this block's metadata."
          error={form.formState.errors.title?.message}
        >
          <Input placeholder="Terms of Service" {...form.register("title")} />
        </AppFormField>
        <Controller
          name="body"
          control={form.control}
          render={({ field }) => (
            <AppFormField label="Body" isRequired error={form.formState.errors.body?.message}>
              <RichTextEditor
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Write the content…"
                editorMinHeightClassName="min-h-[45dvh]"
              />
            </AppFormField>
          )}
        />
        <FormRootError />
        <FormSubmitButton className="w-full">{submitLabel}</FormSubmitButton>
      </form>
    </FormProvider>
  );
}
