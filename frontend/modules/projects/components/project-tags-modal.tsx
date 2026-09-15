"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Tags } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { ResourceModal } from "@/components/ui/resource-modal";
import { syncProjectTags } from "@/modules/projects/actions/admin-project-actions";
import { tagChipStyle, tagIcon } from "@/modules/projects/lib/project-tags";
import type { ProjectTagGroup } from "@/types/project";

// Curation, not moderation: tags take effect publicly the moment they're
// saved, regardless of review state — adding "TOP 30" to a live project puts
// it on the TOP 30 list immediately. The endpoint syncs the whole set, so the
// modal always sends every checked name (and [] clears them).
export function ProjectTagsModal({
  uuid,
  tags,
  groups,
}: {
  uuid: string;
  tags: string[];
  // The catalogue arrives in named groups. They are rendered in the order
  // returned and never switched on by name: groups and tags change in backend
  // config without an API version bump.
  groups: ProjectTagGroup[];
}) {
  const router = useRouter();
  const groupId = useId();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(tags);
  const [isPending, startTransition] = useTransition();

  function toggle(name: string, checked: boolean) {
    setSelected((current) =>
      checked ? [...current, name] : current.filter((item) => item !== name),
    );
  }

  function save() {
    startTransition(async () => {
      const result = await syncProjectTags(uuid, selected);
      if (result.ok) {
        setOpen(false);
        router.refresh();
        toast.success("Tags updated");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <ResourceModal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Reset to what's saved whenever the modal opens, so a cancelled edit
        // doesn't linger into the next one.
        if (next) setSelected(tags);
      }}
      trigger={
        <Button variant="outline" className="gap-1.5">
          <Tags aria-hidden className="size-4" />
          Tags
        </Button>
      }
      title="Curate tags"
      description="Tags are public straight away — they don't wait for a publish."
    >
      {groups.length === 0 ? (
        <EmptyState
          title="The tag catalogue is unavailable"
          description="It couldn't be loaded just now. Try again in a moment."
        />
      ) : (
        <div className="space-y-4">
          <div className="max-h-80 space-y-4 overflow-y-auto">
            {groups.map((group) => (
              <fieldset key={group.group}>
                <legend className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.group}
                </legend>
                <div className="space-y-1">
                  {group.tags.map((tag) => {
                    const checkboxId = `${groupId}-${tag.name}`;
                    const Icon = tagIcon(tag.icon);
                    return (
                      <label
                        key={tag.name}
                        htmlFor={checkboxId}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50"
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={selected.includes(tag.name)}
                          onCheckedChange={(next) => toggle(tag.name, next === true)}
                        />
                        <span
                          style={tagChipStyle(tag.color)}
                          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
                        >
                          <Icon aria-hidden className="size-3.5" />
                          {tag.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p aria-live="polite" className="text-xs text-muted-foreground">
              {selected.length} selected
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" disabled={isPending} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={isPending} onClick={save} className="gap-1.5">
                {isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
                Save tags
              </Button>
            </div>
          </div>
        </div>
      )}
    </ResourceModal>
  );
}
