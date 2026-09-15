import { Code2, ExternalLink, GitBranch, ImageOff, Plug, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/markdown";
import { YouTubeEmbed } from "@/modules/projects/components/youtube-embed";
import { projectCredits } from "@/modules/projects/lib/project-payload";
import type { ProjectSnapshot } from "@/types/project";

// The body of a project — the fields an owner edits, which are exactly the
// fields a published snapshot freezes. Shared by all three audiences: the
// citizen's own detail page, both panes of the admin's working-copy-vs-
// snapshot review, and the public detail page.
export function ProjectContentView({
  project,
  showVideo = true,
  showPhoto = true,
  showLinks = true,
  showFacts = true,
}: {
  // Structurally satisfied by Project, AdminProject, PublicProject and
  // ProjectSnapshot alike — they share the same content fields.
  project: ProjectSnapshot;
  showVideo?: boolean;
  showPhoto?: boolean;
  // The admin review lifts the Live-project/Repository buttons into its
  // Assessment card, so its working-copy view passes false here.
  showLinks?: boolean;
  // False when a sticky rail (PublicProjectRail) carries the tech/APIs/team
  // facts beside this view — the admin review's public-style layout.
  showFacts?: boolean;
}) {
  const credits = projectCredits(project.meta);

  return (
    <div className="space-y-8">
      {showPhoto && (
        // The events-manage banner treatment (aspect 3/1 masthead) — kept in
        // sync with egov-event-details.tsx so admin detail screens read alike.
        <div className="flex aspect-[3/1] items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
          {project.photo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed CDN URL, not configured for next/image
            <img src={project.photo.url} alt="" className="size-full object-cover" />
          ) : (
            <ImageOff aria-hidden className="size-10 text-muted-foreground/40" />
          )}
        </div>
      )}

      {showVideo && <YouTubeEmbed url={project.video_url} title={project.name} />}

      {showLinks && (
      <div className="flex flex-wrap gap-2">
        <a
          href={project.project_url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ExternalLink aria-hidden className="size-4" />
          Live project
        </a>
        {project.repository_url && (
          <a
            href={project.repository_url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <GitBranch aria-hidden className="size-4" />
            Repository
          </a>
        )}
      </div>
      )}

      <div>
        <h2 className="sr-only">About this project</h2>
        <Markdown>{project.description}</Markdown>
      </div>

      {showFacts && (
      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
            <Code2 aria-hidden className="size-4 text-muted-foreground" />
            Built with
          </h2>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {project.tech_stack.map((tech) => (
              <li key={tech}>
                <Badge variant="secondary">{tech}</Badge>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
            <Plug aria-hidden className="size-4 text-muted-foreground" />
            eGov APIs used
          </h2>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {project.egov_apis_used.map((identifier) => (
              <li key={identifier}>
                <Badge variant="secondary" className="font-mono text-xs">
                  {identifier}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      </div>
      )}

      {showFacts && (credits.team || credits.members.length > 0) && (
        <section>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
            <Users aria-hidden className="size-4 text-muted-foreground" />
            Team
          </h2>
          {credits.team && <p className="mt-2 text-sm font-medium">{credits.team}</p>}
          {credits.members.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">{credits.members.join(" · ")}</p>
          )}
        </section>
      )}
    </div>
  );
}
