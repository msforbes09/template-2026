"use client";

import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUpdateSearchParams } from "@/hooks/use-update-search-params";
import { tagIcon } from "@/modules/projects/lib/project-tags";
import type { ProjectTag } from "@/types/project";

// The curation tabs, built from the SELECTED EVENT'S OWN LABELS.
//
// This row used to be a hardcoded [All entries] [TOP 30] [TOP 5], which said
// that every event curates a top thirty and a top five. Curation is per-event
// now (EgovEvent.custom_tags, 2026-08-26 handoff): an event that picks
// "Winner" / "Finalist" / "People's Choice" gets those tabs, and an event that
// curates nothing gets no tabs at all — none of which needs a release.
//
// Order is the API's, deliberately not sorted here: the admin controls it when
// editing the event, and it is the order the tabs are meant to read in.
//
// Still buttons rather than links: these write ?tag= on a page that already
// reads it, and there is no distinct URL path behind them.
export function PublicProjectsTabs({ tags }: { tags: ProjectTag[] }) {
  const params = useSearchParams();
  const update = useUpdateSearchParams();
  const current = params.get("tag") ?? "";

  // "All entries" alone is a control with nothing to switch between. An event
  // that curates nothing gets no row rather than a single dead button.
  if (tags.length === 0) return null;

  const views = [{ tag: "", label: "All entries", color: null as string | null }].concat(
    tags.map((tag) => ({ tag: tag.name, label: tag.name, color: tag.color })),
  );

  return (
    <div
      role="group"
      aria-label="Filter by curation"
      className="flex flex-wrap gap-1 rounded-lg border border-border p-1"
    >
      {views.map((view) => {
        const isCurrent = current === view.tag;
        // The catalogue's own glyph for the label, so a tab and the chip on a
        // card carry the same mark. Unknown slugs fall back rather than
        // rendering a gap — see tagIcon.
        const Icon = view.tag ? tagIcon(tags.find((t) => t.name === view.tag)!.icon) : null;

        return (
          <button
            key={view.tag || "all"}
            type="button"
            aria-pressed={isCurrent}
            onClick={() => update({ tag: view.tag || null }, { resetPage: true })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              isCurrent
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && (
              <Icon
                aria-hidden
                className="size-3.5"
                // The label's own colour, except when selected — the primary
                // fill already carries that state and a second colour on top
                // of it just muddies the contrast.
                style={isCurrent || !view.color ? undefined : { color: view.color }}
              />
            )}
            {view.label}
          </button>
        );
      })}
    </div>
  );
}
