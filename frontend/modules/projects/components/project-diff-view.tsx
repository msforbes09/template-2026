import { ImageOff } from "lucide-react";
import { DiffMarkdownTabs } from "@/modules/projects/components/diff-markdown-tabs";
import {
  diffDisplayValue,
  PROJECT_FIELD_LABELS,
  type ProjectDiffField,
} from "@/modules/projects/lib/project-diff";
import type { ProjectSnapshot } from "@/types/project";

// One thumbnail in the photo diff — the empty frame keeps Before/After
// aligned when a side has no photo.
function PhotoThumb({ side, label }: { side: ProjectSnapshot; label: string }) {
  return (
    <figure className="space-y-1.5">
      <figcaption className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </figcaption>
      <div className="flex aspect-[3/1] w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
        {side.photo?.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed CDN URL, not configured for next/image
          <img src={side.photo.url} alt="" className="size-full object-cover" />
        ) : (
          <ImageOff aria-hidden className="size-6 text-muted-foreground/40" />
        )}
      </div>
    </figure>
  );
}

// The URL-shaped fields render their values as links — an assessor checking
// a changed repository or demo wants to open it, not retype it. The values
// are WS-validated https URLs on both sides (url:https on the FormRequests).
const URL_FIELDS = new Set<ProjectDiffField>(["video_url", "project_url", "repository_url"]);

function DiffValue({ value, isUrl }: { value: string | null; isUrl: boolean }) {
  if (value === null) return <span className="italic">none</span>;
  if (!isUrl) return <>{value}</>;
  return (
    <a
      href={value}
      target="_blank"
      rel="noreferrer noopener"
      className="break-all underline decoration-current/40 underline-offset-2 hover:decoration-current"
    >
      {value}
    </a>
  );
}

// A stacked Before/After pair for a short field — muted for what's live,
// emerald for what publishing would make live.
function TextDiffRows({
  before,
  after,
  isUrl,
}: {
  before: string | null;
  after: string | null;
  isUrl: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <span className="mr-2 text-xs font-medium uppercase tracking-wide">Before</span>
        <DiffValue value={before} isUrl={isUrl} />
      </p>
      <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm">
        <span className="mr-2 text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          After
        </span>
        <DiffValue value={after} isUrl={isUrl} />
      </p>
    </div>
  );
}

// The "What changed" section of the admin review: one card per changed field,
// each showing the live value against the working copy's. Rendered ONLY when
// something actually changed — the caller guards on the diff, so an identical
// working copy never grows this section at all.
export function ProjectDiffView({
  working,
  snapshot,
  changed,
}: {
  working: ProjectSnapshot;
  snapshot: ProjectSnapshot;
  changed: ProjectDiffField[];
}) {
  return (
    <div className="space-y-4">
      {changed.map((field) => (
        <section
          key={field}
          aria-label={`${PROJECT_FIELD_LABELS[field]} changes`}
          className="rounded-xl border border-border bg-card p-4"
        >
          <h3 className="mb-3 text-sm font-semibold tracking-tight">
            {PROJECT_FIELD_LABELS[field]}
          </h3>
          {field === "description" ? (
            <DiffMarkdownTabs before={snapshot.description} after={working.description} />
          ) : field === "photo" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <PhotoThumb side={snapshot} label="Before" />
              <PhotoThumb side={working} label="After" />
            </div>
          ) : (
            <TextDiffRows
              before={diffDisplayValue(snapshot, field)}
              after={diffDisplayValue(working, field)}
              isUrl={URL_FIELDS.has(field)}
            />
          )}
        </section>
      ))}
    </div>
  );
}
