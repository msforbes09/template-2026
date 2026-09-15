"use client";

import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Users } from "lucide-react";
import { AppFormField } from "@/components/ui/app-form-field";
import { FormRootError } from "@/components/ui/form-root-error";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { applyResultErrors } from "@/lib/apply-result-errors";
import { BroadcastPreview } from "@/modules/broadcasts/components/broadcast-preview";
import { describeAudience } from "@/modules/broadcasts/lib/broadcast-audience";
import {
  broadcastSchema,
  BODY_MAX,
  BROADCAST_FIELDS,
  TITLE_MAX,
  toBroadcastFilters,
  ACCOUNT_STATUS_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
  type BroadcastValues,
} from "@/modules/broadcasts/schemas/broadcast-schema";
import type { ActionResult } from "@/lib/action-result";
import type { AdminBroadcast } from "@/types/broadcast";
import { useResetOnHide } from "@/hooks/use-reset-on-hide";

// Compose or edit a draft. Saving never delivers — Start is a separate,
// deliberate action on the draft, so this form has no send button at all.

const NONE = "__none__";

function Counter({ value, max }: { value: string; max: number }) {
  const used = value.trim().length;
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        used > max ? "font-medium text-destructive" : "text-muted-foreground",
      )}
    >
      {used}/{max}
    </span>
  );
}

export function BroadcastForm({
  defaultValues,
  onSubmit,
  onSuccess,
  submitLabel,
  secondaryAction,
}: {
  defaultValues: BroadcastValues;
  onSubmit: (values: BroadcastValues) => Promise<ActionResult<AdminBroadcast>>;
  onSuccess: (broadcast: AdminBroadcast) => void;
  submitLabel: string;
  secondaryAction?: React.ReactNode;
}) {
  const form = useForm<BroadcastValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues,
  });

  // Re-seeded when the route is hidden — navigation does not unmount it. A
  // draft broadcast left half-composed must not reappear on the next visit to
  // the compose page, least of all one already addressed to an audience.
  useResetOnHide(() => form.reset());
  const errors = form.formState.errors;

  const title = form.watch("title");
  const body = form.watch("body");
  const audience = form.watch("audience");
  const type = form.watch("type");
  const status = form.watch("status");
  const userUuid = form.watch("user_uuid");

  // Described from the same helper the history table and the start dialog use,
  // so what the admin is told here is what actually ships.
  // Built from the WATCHED values only — form.getValues() reads the mutable
  // store and would not re-render this line when a dropdown changed, which is
  // the one place a stale audience must never be shown.
  const described = describeAudience(
    toBroadcastFilters({ title, body, audience, type, status, user_uuid: userUuid }),
  );

  async function handleSubmit(values: BroadcastValues) {
    const result = await onSubmit(values);
    if (result.ok) {
      onSuccess(result.data);
      return;
    }
    applyResultErrors(form, result, BROADCAST_FIELDS);
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={(event) => {
          void form.handleSubmit(handleSubmit)(event);
        }}
        className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start"
        noValidate
      >
        <div className="flex flex-col gap-6">
          <AppFormField
            label="Title"
            isRequired
            error={errors.title?.message}
            userInfo="Shown as the notification's headline."
          >
            <div className="flex flex-col gap-1.5">
              <Input placeholder="Scheduled maintenance" {...form.register("title")} />
              <div className="flex justify-end">
                <Counter value={title} max={TITLE_MAX} />
              </div>
            </div>
          </AppFormField>

          <AppFormField
            label="Message"
            isRequired
            error={errors.body?.message}
            // Said explicitly because the temptation to write markdown in a
            // 1000-character box is real, and it would ship as literal
            // asterisks to every recipient.
            userInfo="Plain text. Citizens see it exactly as written — formatting is not rendered."
          >
            <div className="flex flex-col gap-1.5">
              <Textarea
                rows={6}
                placeholder="The platform will be down Saturday 02:00–04:00."
                {...form.register("body")}
              />
              <div className="flex justify-end">
                <Counter value={body} max={BODY_MAX} />
              </div>
            </div>
          </AppFormField>

          <AppFormField label="Who receives this" isRequired error={errors.type?.message}>
            <div className="flex flex-col gap-3">
              <ToggleGroup
                variant="outline"
                className="w-full"
                value={[audience]}
                onValueChange={(values) => {
                  const next = values[0] as BroadcastValues["audience"] | undefined;
                  // A required single choice: clicking the selected option
                  // must not clear it and leave no audience at all.
                  if (!next) return;
                  form.setValue("audience", next, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
              >
                <ToggleGroupItem value="everyone" className="flex-1">
                  Everyone
                </ToggleGroupItem>
                <ToggleGroupItem value="segment" className="flex-1">
                  Segment
                </ToggleGroupItem>
                <ToggleGroupItem value="user" className="flex-1">
                  One citizen
                </ToggleGroupItem>
              </ToggleGroup>

              {audience === "segment" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    value={type || NONE}
                    onValueChange={(value) =>
                      form.setValue("type", value === NONE ? "" : String(value), {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  >
                    <SelectTrigger aria-label="Account type">
                      <SelectValue placeholder="Any account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value={NONE}>Any account type</SelectItem>
                        {ACCOUNT_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  <Select
                    value={status || NONE}
                    onValueChange={(value) =>
                      form.setValue("status", value === NONE ? "" : String(value), {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  >
                    <SelectTrigger aria-label="Account status">
                      <SelectValue placeholder="Any status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value={NONE}>Any status</SelectItem>
                        {ACCOUNT_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {audience === "user" && (
                <AppFormField
                  label="Citizen UUID"
                  isRequired
                  error={errors.user_uuid?.message}
                  userInfo="From the citizen's row in Users."
                >
                  <Input
                    className="font-mono"
                    placeholder="9d3f0a1e-…"
                    {...form.register("user_uuid")}
                  />
                </AppFormField>
              )}
            </div>
          </AppFormField>

          {/* The audience in words, next to the controls that set it. */}
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <Users aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p>
              This will notify <span className="font-semibold">{described.label}</span>.
              {described.isEveryone && " Starting it cannot be undone."}
            </p>
          </div>

          {described.includesSuspendedOnly && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p>
                Suspended accounts are read-only. They can read this announcement but
                cannot act on anything it asks them to do.
              </p>
            </div>
          )}

          <FormRootError />

          <div className="flex flex-wrap items-center gap-3">
            <FormSubmitButton>{submitLabel}</FormSubmitButton>
            {secondaryAction}
            <p className="text-sm text-muted-foreground">
              Saving does not send. You start the broadcast from the draft.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:sticky lg:top-6">
          <p className="text-sm font-medium">Preview</p>
          <p className="text-xs text-muted-foreground">
            Exactly how it appears in a citizen&apos;s notification bell.
          </p>
          <BroadcastPreview title={title} body={body} />
        </div>
      </form>
    </FormProvider>
  );
}
