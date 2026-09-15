"use client";

import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppFormField } from "@/components/ui/app-form-field";
import { FormRootError } from "@/components/ui/form-root-error";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { JsonEditor } from "@/modules/api-catalog/components/json-editor";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { applyResultErrors } from "@/lib/apply-result-errors";
import {
  apiCatalogSchema,
  type ApiCatalogValues,
} from "@/modules/api-catalog/schemas/api-catalog-schema";
import type { ActionResult } from "@/lib/action-result";
import type { ApiCatalog } from "@/types/api-catalog";

const FIELDS = ["name", "description", "body", "meta"] as const;

export function ApiCatalogForm({
  defaultValues,
  onSubmit,
  onSuccess,
  submitLabel,
}: {
  defaultValues?: Partial<ApiCatalogValues>;
  onSubmit: (values: ApiCatalogValues) => Promise<ActionResult<ApiCatalog>>;
  onSuccess: (data: ApiCatalog) => void;
  submitLabel: string;
}) {
  const form = useForm<ApiCatalogValues>({
    resolver: zodResolver(apiCatalogSchema),
    defaultValues,
  });

  async function handleSubmit(values: ApiCatalogValues) {
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
        <div className="grid gap-5 lg:grid-cols-2">
          <AppFormField label="Name" isRequired error={form.formState.errors.name?.message}>
            <Input placeholder="eGov SSO" {...form.register("name")} />
          </AppFormField>
          <AppFormField
            label="Description"
            userInfo="Optional. Shown in the public API catalog listing."
            error={form.formState.errors.description?.message}
          >
            <Textarea
              placeholder="Single Sign-On integration for eGov partners."
              className="min-h-16"
              {...form.register("description")}
            />
          </AppFormField>
        </div>

        <Controller
          name="body"
          control={form.control}
          render={({ field }) => (
            <AppFormField
              label="Body"
              userInfo="Markdown. Rendered as the entry's documentation page."
              error={form.formState.errors.body?.message}
            >
              <MarkdownEditor
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="# eGov SSO&#10;&#10;How to integrate…"
              />
            </AppFormField>
          )}
        />

        <Controller
          name="meta"
          control={form.control}
          render={({ field }) => (
            <AppFormField
              label="Meta"
              userInfo="Optional free-form metadata as a JSON object."
              error={form.formState.errors.meta?.message}
            >
              <JsonEditor value={field.value ?? ""} onChange={field.onChange} />
            </AppFormField>
          )}
        />

        <FormRootError />
        <FormSubmitButton className="w-full">{submitLabel}</FormSubmitButton>
      </form>
    </FormProvider>
  );
}
