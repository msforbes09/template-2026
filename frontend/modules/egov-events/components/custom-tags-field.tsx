"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppFormField } from "@/components/ui/app-form-field";
import { tagChipStyle, tagIcon } from "@/modules/projects/lib/project-tags";
import {
  EMPTY_CUSTOM_TAG,
  MAX_CUSTOM_TAGS,
  type EgovEventValues,
} from "@/modules/egov-events/schemas/egov-event-schema";

// This event's curation labels — the ones the public showcase turns into tabs.
//
// ORDER IS THE POINT. The tab row renders in exactly this order, so these are
// reorderable rows rather than a set. Move buttons rather than drag-and-drop:
// they are keyboard-operable and screen-reader-announceable for free, where a
// drag surface needs a parallel keyboard path built by hand to be usable at
// all.
//
// Saving REPLACES the whole set (it is not a merge), which is why the form
// always sends the array — including an empty one, which clears it.
export function CustomTagsField() {
  const form = useFormContext<EgovEventValues>();
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "custom_tags",
  });

  const errors = form.formState.errors;
  // The array-level message (too many, duplicate names) rather than a row's.
  const listError =
    typeof errors.custom_tags?.message === "string" ? errors.custom_tags.message : undefined;

  return (
    <AppFormField
      label="Curation tags"
      userInfo="These become the filter tabs on the public showcase, in this order. Saving replaces the whole set."
      error={listError}
    >
      <div className="flex flex-col gap-3">
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No curation tags. The showcase will show all entries with no tabs.
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {fields.map((field, index) => {
            const rowErrors = errors.custom_tags?.[index];
            // Watched so the preview chip tracks what is being typed, which is
            // the only way to tell a good icon slug from a fallback glyph
            // before saving.
            const row = form.watch(`custom_tags.${index}`);
            const Icon = tagIcon(row?.icon ?? "");

            return (
              <li key={field.id} className="rounded-lg border border-border p-3">
                <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
                  <AppFormField label="Name" isRequired error={rowErrors?.name?.message}>
                    <Input
                      placeholder="TOP 30"
                      {...form.register(`custom_tags.${index}.name`)}
                    />
                  </AppFormField>

                  <AppFormField label="Colour" isRequired error={rowErrors?.color?.message}>
                    <div className="flex items-center gap-2">
                      {/* The picker and the text box write the same field, so
                          a hex can be pasted or chosen. */}
                      <input
                        type="color"
                        aria-label={`Colour for tag ${index + 1}`}
                        className="size-9 shrink-0 cursor-pointer rounded-md border border-border bg-background p-1"
                        value={/^#[0-9a-fA-F]{6}$/.test(row?.color ?? "") ? row.color : "#F59E0B"}
                        onChange={(event) =>
                          form.setValue(`custom_tags.${index}.color`, event.target.value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      />
                      <Input
                        placeholder="#F59E0B"
                        className="font-mono"
                        {...form.register(`custom_tags.${index}.color`)}
                      />
                    </div>
                  </AppFormField>

                  <AppFormField
                    label="Icon"
                    isRequired
                    userInfo="A lucide icon slug, e.g. trophy or bar-chart-3."
                    error={rowErrors?.icon?.message}
                  >
                    <Input
                      placeholder="trophy"
                      className="font-mono"
                      {...form.register(`custom_tags.${index}.icon`)}
                    />
                  </AppFormField>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  {/* Exactly the chip the public site will render. An unknown
                      icon slug shows its fallback here rather than after
                      saving. */}
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium"
                    style={tagChipStyle(
                      /^#[0-9a-fA-F]{6}$/.test(row?.color ?? "") ? row.color : "#64748B",
                    )}
                  >
                    <Icon aria-hidden className="size-3.5" />
                    {row?.name?.trim() || "Preview"}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${row?.name?.trim() || `tag ${index + 1}`} up`}
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      <ArrowUp aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${row?.name?.trim() || `tag ${index + 1}`} down`}
                      disabled={index === fields.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      <ArrowDown aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${row?.name?.trim() || `tag ${index + 1}`}`}
                      onClick={() => remove(index)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={fields.length >= MAX_CUSTOM_TAGS}
            onClick={() => append({ ...EMPTY_CUSTOM_TAG })}
          >
            <Plus data-icon="inline-start" />
            Add tag
          </Button>
          {/* Stated before the limit is hit, not as an error after. */}
          <span className="text-xs text-muted-foreground">
            {fields.length} of {MAX_CUSTOM_TAGS}
          </span>
        </div>
      </div>
    </AppFormField>
  );
}
