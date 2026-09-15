import { Badge } from "@/components/ui/badge";
import { projectCredits } from "@/modules/projects/lib/project-payload";
import type { PublicProject } from "@/types/project";

// The facts a judge or an integrator scans for: which government services this
// connects to, what it is built with, who built it. In the old layout these
// sat below the description, so reaching them meant reading past the whole
// write-up. As a sticky rail they stay in view for the length of the read.
//
// Rendered as labelled groups separated by negative space and one hairline
// each, not as a spec table with a border on every row.
export function PublicProjectRail({
  project,
}: {
  // Structural: the public show passes PublicProject, the admin review its
  // AdminProject working copy — the rail reads only these three fields, and
  // sharing it is what keeps the two pages from drifting apart.
  project: Pick<PublicProject, "egov_apis_used" | "tech_stack" | "meta">;
}) {
  const credits = projectCredits(project.meta);

  return (
    <aside
      aria-label="Project details"
      // The aside is the grid child itself, not a wrapper's child: `sticky`
      // resolves against the grid container, so it only travels if nothing
      // stretches it. Hence `self-start` and no Reveal wrapper (a transformed
      // ancestor would box it in at its own height).
      className="space-y-8 lg:col-span-4 lg:sticky lg:top-24 lg:self-start"
    >
      <div>
        <h2 className="text-sm font-semibold tracking-tight">eGov APIs used</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Government services this project connects to.
        </p>
        <ul className="mt-4 space-y-2">
          {project.egov_apis_used.map((identifier) => (
            <li key={identifier}>
              {/* Cobalt-tinted rather than neutral: these are the reason the
                  project is on this site, so they read as the accent. */}
              <span className="inline-flex rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 font-mono text-xs font-medium text-primary">
                {identifier}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-border pt-8">
        <h2 className="text-sm font-semibold tracking-tight">Built with</h2>
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {project.tech_stack.map((tech) => (
            <li key={tech}>
              <Badge variant="secondary" className="font-normal">
                {tech}
              </Badge>
            </li>
          ))}
        </ul>
      </div>

      {/* Members only. The team name is already the hero's credit line, and
          printing it again here as a heading plus a value read as a stutter. */}
      {credits.members.length > 0 && (
        <div className="border-t border-border pt-8">
          <h2 className="text-sm font-semibold tracking-tight">Team members</h2>
          <ul className="mt-3 space-y-1">
            {credits.members.map((member) => (
              <li key={member} className="text-sm text-muted-foreground">
                {member}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
