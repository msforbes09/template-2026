import Link from "next/link";
import { ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format-date";
import { ProjectTagChips } from "@/modules/projects/components/project-tag-chips";
import type { ProjectTag, PublicProjectListItem } from "@/types/project";
import { ProjectRatingSummary } from "@/modules/projects/components/project-rating-summary";

// A published project as a public showcase card. Everything here comes from
// the frozen snapshot — there is no owner, no status and no account identity
// on the public site at all.
export function PublicProjectCard({
  project,
  catalog,
}: {
  project: PublicProjectListItem;
  catalog: ProjectTag[];
}) {
  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-sm">
      <div className="flex aspect-[16/9] items-center justify-center overflow-hidden bg-muted/40">
        {project.photo?.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed CDN URL, not configured for next/image
          <img
            src={project.photo.url}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <ImageOff aria-hidden className="size-8 text-muted-foreground/40" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <ProjectTagChips tags={project.tags} catalog={catalog} size="sm" limit={2} />
        <h3 className="text-base font-semibold leading-snug tracking-tight">
          <Link
            href={`/projects/${project.uuid}`}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {project.name}
          </Link>
        </h3>
        {project.tagline && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {project.tagline}
          </p>
        )}
        <div className="mt-auto space-y-3 pt-2">
          {project.egov_apis_used.length > 0 && (
            <ul className="flex flex-wrap gap-1">
              {project.egov_apis_used.slice(0, 3).map((identifier) => (
                <li key={identifier}>
                  <Badge variant="secondary" className="font-mono text-[11px]">
                    {identifier}
                  </Badge>
                </li>
              ))}
              {project.egov_apis_used.length > 3 && (
                <li>
                  <Badge variant="secondary" className="text-[11px]">
                    +{project.egov_apis_used.length - 3}
                  </Badge>
                </li>
              )}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            {project.tech_stack.slice(0, 4).join(" · ")}
            {project.tech_stack.length > 4 && ` · +${project.tech_stack.length - 4}`}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Published {formatDate(project.published_at, "dd MMM yyyy")}
            </p>
            <ProjectRatingSummary subject={project} size="sm" />
          </div>
        </div>
      </div>
    </article>
  );
}
