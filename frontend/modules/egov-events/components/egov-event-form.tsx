"use client";

import { useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppFormField } from "@/components/ui/app-form-field";
import { FormRootError } from "@/components/ui/form-root-error";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/modules/uploads/components/file-uploader";
import { CustomTagsField } from "@/modules/egov-events/components/custom-tags-field";
import { applyResultErrors } from "@/lib/apply-result-errors";
import {
  egovEventSchema,
  EGOV_EVENT_FIELDS,
  type EgovEventValues,
} from "@/modules/egov-events/schemas/egov-event-schema";
import type { ActionResult } from "@/lib/action-result";
import type { AdminEgovEvent } from "@/types/project";
import type { UploadedFile } from "@/types/upload";
import { useResetOnHide } from "@/hooks/use-reset-on-hide";

// Shared by create and edit. There is no slug field on purpose: the slug is
// generated from the name and regenerated whenever the name changes, so an
// editable one would imply a control that does not exist.
export function EgovEventForm({
  defaultValues,
  defaultPhoto = null,
  onSubmit,
  onSuccess,
  submitLabel,
  secondaryAction,
}: {
  defaultValues: EgovEventValues;
  defaultPhoto?: UploadedFile | null;
  onSubmit: (values: EgovEventValues) => Promise<ActionResult<AdminEgovEvent>>;
  onSuccess: (event: AdminEgovEvent) => void;
  submitLabel: string;
  secondaryAction?: React.ReactNode;
}) {
  const form = useForm<EgovEventValues>({
    resolver: zodResolver(egovEventSchema),
    defaultValues,
  });
  const [photo, setPhoto] = useState<UploadedFile | null>(defaultPhoto);

  // See ProjectForm: the route is hidden rather than unmounted on navigation,
  // so the form is re-seeded here. `photo` mirrors a form field and goes with
  // it; the custom-tags useFieldArray is part of the form, so reset() covers it.
  useResetOnHide(() => {
    form.reset();
    setPhoto(defaultPhoto);
  });
  const errors = form.formState.errors;

  function handlePhotoChange(file: UploadedFile | null) {
    setPhoto(file);
    form.setValue("photo_uuid", file?.uuid ?? "", { shouldDirty: true, shouldValidate: true });
  }

  async function handleSubmit(values: EgovEventValues) {
    const result = await onSubmit(values);
    if (result.ok) {
      onSuccess(result.data);
      return;
    }
    applyResultErrors(form, result, EGOV_EVENT_FIELDS);
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={(event) => {
          void form.handleSubmit(handleSubmit)(event);
        }}
        className="space-y-6"
        noValidate
      >
        {/* First, like the read-only view renders it — the banner is the
            page's masthead in both modes. */}
        <AppFormField label="Cover photo" isRequired error={errors.photo_uuid?.message}>
          <FileUploader
            visibility="private"
            accept="image/*"
            preview="banner"
            value={photo}
            onChange={handlePhotoChange}
          />
        </AppFormField>

        <AppFormField
          label="Name"
          isRequired
          userInfo="The public URL for this event is generated from its name, and changes if you rename it."
          error={errors.name?.message}
        >
          <Input placeholder="eGov Hackathon 2026" {...form.register("name")} />
        </AppFormField>

        <AppFormField label="Description" error={errors.description?.message}>
          <Textarea
            rows={3}
            placeholder="The national hackathon for eGov developers."
            {...form.register("description")}
          />
        </AppFormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <AppFormField
            label="Starts"
            userInfo="YYYY-MM-DD HH:MM:SS"
            error={errors.starts_at?.message}
          >
            <Input placeholder="2026-09-01 08:00:00" {...form.register("starts_at")} />
          </AppFormField>
          <AppFormField
            label="Ends"
            userInfo="YYYY-MM-DD HH:MM:SS"
            error={errors.ends_at?.message}
          >
            <Input placeholder="2026-09-30 17:00:00" {...form.register("ends_at")} />
          </AppFormField>
        </div>

        {/* One key here is read by the public site rather than just displayed:
            `criteria_route` becomes the "How entries are judged" link on the
            landing showcase and the projects page. Called out in the hint
            because a free-form textarea gives no other way to discover it. */}
        <AppFormField
          label="Extras"
          userInfo={
            'Public, free-form JSON — venue, prizes, links. e.g. {"venue": "PICC"}. ' +
            'Set "criteria_route" to a page path or link to show a "How entries are judged" ' +
            'link for this event, e.g. {"criteria_route": "/egov-hackathon-2026-criteria"}'
          }
          error={errors.meta?.message}
        >
          <Textarea
            rows={4}
            className="font-mono text-xs"
            placeholder='{"venue": "PICC", "criteria_route": "/egov-hackathon-2026-criteria"}'
            {...form.register("meta")}
          />
        </AppFormField>

        <CustomTagsField />

        {/* Two independent switches, and the distinction matters: closing an
            event no longer hides it. Ending a programme and withdrawing it
            from the public site are separate decisions, and the copy below
            has to say so — the old "Active" help text claimed closing hid
            the public page, which stopped being true on 2026-08-23. */}
        <Controller
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">Accepting projects</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Only active events can be chosen when someone enters a new project. Closing one
                  stops new entries; everything already entered stays published and browsable.
                </p>
              </div>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-label="Accepting projects"
              />
            </div>
          )}
        />

        <Controller
          control={form.control}
          name="is_published"
          render={({ field }) => (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">Publicly visible</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Turning this off closes the event&apos;s project showcase to visitors. The event
                  itself stays listed, and its projects are not deleted or unpublished.
                </p>
              </div>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-label="Publicly visible"
              />
            </div>
          )}
        />

        <FormRootError />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {secondaryAction}
          <FormSubmitButton>{submitLabel}</FormSubmitButton>
        </div>
      </form>
    </FormProvider>
  );
}
