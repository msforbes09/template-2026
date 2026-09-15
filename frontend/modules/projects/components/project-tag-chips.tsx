import { cn } from "@/lib/utils";
import { resolveTags, tagChipStyle, tagIcon } from "@/modules/projects/lib/project-tags";
import type { ProjectTag } from "@/types/project";

// Projects return tags as plain names; color and icon come from the
// catalogue, joined here (see project-tags.ts). A name the catalogue doesn't
// know still renders, in neutral slate.
export function ProjectTagChips({
  tags,
  catalog,
  size = "default",
  limit,
  className,
}: {
  tags: string[];
  catalog: ProjectTag[];
  size?: "default" | "sm";
  // Caps how many chips render, with a "+N" counter for the rest — for card
  // footers where a heavily-tagged project would otherwise wrap three rows.
  limit?: number;
  className?: string;
}) {
  const resolved = resolveTags(tags, catalog);
  if (resolved.length === 0) return null;

  const shown = limit ? resolved.slice(0, limit) : resolved;
  const hidden = resolved.length - shown.length;

  return (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {shown.map((tag) => {
        const Icon = tagIcon(tag.icon);
        return (
          <li key={tag.name}>
            <span
              style={tagChipStyle(tag.color)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border font-medium",
                size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
              )}
            >
              <Icon aria-hidden className={size === "sm" ? "size-3" : "size-3.5"} />
              {tag.name}
            </span>
          </li>
        );
      })}
      {hidden > 0 && (
        <li>
          <span
            className={cn(
              "inline-flex items-center rounded-full border border-border text-muted-foreground",
              size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
            )}
          >
            +{hidden} more
          </span>
        </li>
      )}
    </ul>
  );
}
