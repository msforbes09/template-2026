"use client";

import { useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { AppFormField } from "@/components/ui/app-form-field";
import { FormRootError } from "@/components/ui/form-root-error";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { FileUploader } from "@/modules/uploads/components/file-uploader";
import { EgovApisField } from "@/modules/projects/components/egov-apis-field";
import { StringListInput } from "@/modules/projects/components/string-list-input";
import { applyResultErrors } from "@/lib/apply-result-errors";
import {
  normalizeProjectErrors,
  projectSchema,
  PROJECT_FIELDS,
  type ProjectValues,
} from "@/modules/projects/schemas/project-schema";
import type { ActionResult } from "@/lib/action-result";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EgovEvent } from "@/types/project";
import type { PublicApiCatalogItem } from "@/types/public-api-catalog";

// Select cannot hold "" as a value, so "none" is its own sentinel and is
// mapped back to "" (which toProjectInput reads as "send nothing").
const NO_EVENT = "__none__";
import type { UploadedFile } from "@/types/upload";
import { useResetOnHide } from "@/hooks/use-reset-on-hide";

// One form for all four entry points: a citizen creating or editing their own
// project, and an admin creating or editing one in the admin lane. What
// changes between them is the submit action and the upload action (each
// audience has its own token for POST common/files/private) — everything
// else, including validation, is identical because the API's ProjectInput is.
export function ProjectForm<T>({
  catalogs,
  defaultValues,
  defaultPhoto = null,
  uploadAction,
  onSubmit,
  onSuccess,
  submitLabel,
  showGallery = false,
  // The programme picker. Passed only where the API accepts the field: the
  // citizen CREATE form and both admin forms. Omitted on citizen edit, where
  // it would be ignored.
  events,
  eventFieldHint,
  reviewWarning,
  secondaryAction,
}: {
  // Live API catalogue, fetched by the page — `egov_apis_used` must be
  // active identifiers from it.
  catalogs: PublicApiCatalogItem[];
  defaultValues: ProjectValues;
  // Seeds the uploader's preview in edit mode; RHF only carries the flat
  // photo_uuid the form submits.
  defaultPhoto?: UploadedFile | null;
  uploadAction: (formData: FormData) => Promise<ActionResult<UploadedFile>>;
  onSubmit: (values: ProjectValues) => Promise<ActionResult<T>>;
  onSuccess: (data: T) => void;
  submitLabel: string;
  // The admin editor gets the image gallery; citizens don't (its endpoints
  // are admin-only).
  showGallery?: boolean;
  events?: EgovEvent[];
  eventFieldHint?: string;
  // Shown above the submit button when saving would pull the project out of
  // a review queue or leave a live version standing (see editResetsReview).
  reviewWarning?: string;
  secondaryAction?: React.ReactNode;
}) {
  const form = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues,
  });
  const [photo, setPhoto] = useState<UploadedFile | null>(defaultPhoto);

  // Back to the record as saved (or to a blank form, on the create pages) when
  // this route is navigated away from. cacheComponents only HIDES the route, so
  // without this a half-written project is still sitting here on the next
  // visit — and after a create, the new form opens holding the last one.
  // `photo` mirrors a form field, so it has to be re-seeded alongside or the
  // preview and photo_uuid disagree.
  useResetOnHide(() => {
    form.reset();
    setPhoto(defaultPhoto);
  });
  const errors = form.formState.errors;

  function handlePhotoChange(file: UploadedFile | null) {
    setPhoto(file);
    form.setValue("photo_uuid", file?.uuid ?? "", { shouldDirty: true, shouldValidate: true });
  }

  async function handleSubmit(values: ProjectValues) {
    const result = await onSubmit(values);
    if (result.ok) {
      onSuccess(result.data);
      return;
    }
    // Laravel reports array errors per index (`egov_apis_used.0`); those keys
    // match no input, so they're folded onto the array field first.
    applyResultErrors(
      form,
      { message: result.message, errors: normalizeProjectErrors(result.errors) },
      PROJECT_FIELDS,
    );
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={(event) => {
          void form.handleSubmit(handleSubmit)(event);
        }}
        className="space-y-10"
        noValidate
      >
        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">The basics</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              How your project is introduced on its card and at the top of its page.
            </p>
          </div>
          <AppFormField label="Project name" isRequired error={errors.name?.message}>
            <Input placeholder="Your project's name" {...form.register("name")} />
          </AppFormField>
          <AppFormField
            label="Tagline"
            userInfo="One line, shown under the name on cards. Up to 160 characters."
            error={errors.tagline?.message}
          >
            <Input placeholder="A short line describing what it does" {...form.register("tagline")} />
          </AppFormField>
          <AppFormField
            label="Cover photo"
            userInfo="A screenshot or logo. Shown on your project card and page."
            error={errors.photo_uuid?.message}
          >
            <FileUploader
              visibility="private"
              accept="image/*"
              preview="banner"
              value={photo}
              onChange={handlePhotoChange}
              uploadAction={uploadAction}
            />
          </AppFormField>
        </section>

        {events && events.length > 0 && (
          <section className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Event</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {eventFieldHint ??
                  "Which programme this project is entered into. This cannot be changed later."}
              </p>
            </div>
            <Controller
              control={form.control}
              name="egov_event_id"
              render={({ field }) => (
                <AppFormField label="Event" error={errors.egov_event_id?.message}>
                  <Select
                    value={field.value || NO_EVENT}
                    items={{
                      [NO_EVENT]: "No event",
                      ...Object.fromEntries(events.map((e) => [String(e.id), e.name])),
                    }}
                    onValueChange={(value) =>
                      field.onChange(value === NO_EVENT ? "" : value)
                    }
                  >
                    <SelectTrigger aria-label="Event">
                      <SelectValue placeholder="Choose an event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_EVENT}>No event</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={String(event.id)}>
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </AppFormField>
              )}
            />
          </section>
        )}

        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Description</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Markdown. What the project does, who it&apos;s for, and how it uses the eGov APIs.
            </p>
          </div>
          <Controller
            control={form.control}
            name="description"
            render={({ field }) => (
              <AppFormField label="Description" isRequired error={errors.description?.message}>
                <MarkdownEditor
                  value={field.value}
                  onChange={field.onChange}
                  showGallery={showGallery}
                  placeholder="# Your project&#10;&#10;What it does, who it's for…"
                  className="h-[40dvh]"
                />
              </AppFormField>
            )}
          />
        </section>

        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Links</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Where judges and visitors can see the project running.
            </p>
          </div>
          <AppFormField
            label="Demo video"
            isRequired
            userInfo="A YouTube link — youtube.com or youtu.be, over https."
            error={errors.video_url?.message}
          >
            <Input
              inputMode="url"
              placeholder="https://www.youtube.com/watch?v=…"
              {...form.register("video_url")}
            />
          </AppFormField>
          <AppFormField
            label="Live project"
            isRequired
            userInfo="The running app or demo. Must be https."
            error={errors.project_url?.message}
          >
            <Input
              inputMode="url"
              placeholder="https://your-project.example.ph"
              {...form.register("project_url")}
            />
          </AppFormField>
          <AppFormField
            label="Repository"
            userInfo="Optional. A public source repository, if you have one."
            error={errors.repository_url?.message}
          >
            <Input
              inputMode="url"
              placeholder="https://github.com/your-team/your-project"
              {...form.register("repository_url")}
            />
          </AppFormField>
        </section>

        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">What it&apos;s built with</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Both lists are filters on the public site, so visitors can find projects like yours.
            </p>
          </div>
          <Controller
            control={form.control}
            name="tech_stack"
            render={({ field }) => (
              <AppFormField
                label="Tech stack"
                isRequired
                userInfo="Press Enter after each one. Up to 30."
                error={errors.tech_stack?.message}
              >
                <StringListInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="One technology at a time"
                  addLabel="Add"
                  maxItems={30}
                  maxLength={50}
                />
              </AppFormField>
            )}
          />
          <Controller
            control={form.control}
            name="egov_apis_used"
            render={({ field }) => (
              <AppFormField
                label="eGov APIs used"
                isRequired
                userInfo="Select every API this project integrates with."
                error={errors.egov_apis_used?.message}
              >
                <EgovApisField
                  catalogs={catalogs}
                  value={field.value}
                  onChange={field.onChange}
                />
              </AppFormField>
            )}
          />
        </section>

        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Credit</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The public page shows no account details, so this is the only place your team is
              named.
            </p>
          </div>
          <AppFormField label="Team name" error={errors.team_name?.message}>
            <Input placeholder="Your team's name" {...form.register("team_name")} />
          </AppFormField>
          <Controller
            control={form.control}
            name="team_members"
            render={({ field }) => (
              <AppFormField
                label="Team members"
                userInfo="Press Enter after each name."
                error={errors.team_members?.message}
              >
                <StringListInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="One member at a time"
                  addLabel="Add"
                  maxItems={30}
                  maxLength={150}
                />
              </AppFormField>
            )}
          />
        </section>

        {reviewWarning && (
          <p
            role="status"
            className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
          >
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {reviewWarning}
          </p>
        )}
        <FormRootError />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {secondaryAction}
          <FormSubmitButton>{submitLabel}</FormSubmitButton>
        </div>
      </form>
    </FormProvider>
  );
}
