import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format-date";
import { tagChipStyle, tagIcon } from "@/modules/projects/lib/project-tags";
import type { AdminEgovEvent } from "@/types/project";

// The read-only counterpart of EgovEventForm, shown to admins holding
// egov-events-view but not egov-events-manage. Mirrors the form's sections so
// a viewer sees the same event an editor would — just as text.
export function EgovEventDetails({ event }: { event: AdminEgovEvent }) {
  const tags = event.custom_tags ?? [];

  return (
    <div className="space-y-6">
      {event.photo?.url && (
        // eslint-disable-next-line @next/next/no-img-element -- remote CDN origin, not configured for next/image
        <img
          src={event.photo.url}
          alt={`Cover photo for ${event.name}`}
          className="aspect-[3/1] w-full rounded-xl border border-border object-cover"
        />
      )}

      <DetailField label="Name">
        <p className="text-sm">{event.name}</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">/{event.slug}</p>
      </DetailField>

      <DetailField label="Description">
        {event.description ? (
          <p className="whitespace-pre-wrap text-sm">{event.description}</p>
        ) : (
          <Unset />
        )}
      </DetailField>

      <div className="grid gap-4 sm:grid-cols-2">
        <DetailField label="Starts">
          {event.starts_at ? (
            <p className="text-sm">{formatDate(event.starts_at, "dd MMM yyyy HH:mm")}</p>
          ) : (
            <Unset />
          )}
        </DetailField>
        <DetailField label="Ends">
          {event.ends_at ? (
            <p className="text-sm">{formatDate(event.ends_at, "dd MMM yyyy HH:mm")}</p>
          ) : (
            <Unset />
          )}
        </DetailField>
      </div>

      <DetailField label="Extras">
        {event.meta ? (
          <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs">
            {JSON.stringify(event.meta, null, 2)}
          </pre>
        ) : (
          <Unset />
        )}
      </DetailField>

      <DetailField label="Curation tags">
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No curation tags. The showcase shows all entries with no tabs.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const Icon = tagIcon(tag.icon);
              return (
                <li
                  key={tag.name}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
                  style={tagChipStyle(tag.color)}
                >
                  <Icon aria-hidden className="size-3.5" />
                  {tag.name}
                </li>
              );
            })}
          </ul>
        )}
      </DetailField>

      <div className="flex flex-wrap gap-2">
        <Badge
          variant="secondary"
          className={
            event.is_active === 1
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : undefined
          }
        >
          {event.is_active === 1 ? "Accepting projects" : "Closed"}
        </Badge>
        <Badge
          variant="secondary"
          className={
            event.is_published !== 0
              ? undefined
              : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
          }
        >
          {event.is_published !== 0 ? "Publicly visible" : "Hidden"}
        </Badge>
      </div>
    </div>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {children}
    </div>
  );
}

function Unset() {
  return <p className="text-sm text-muted-foreground">—</p>;
}
