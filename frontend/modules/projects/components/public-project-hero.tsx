import Link from "next/link";
import { ArrowUpRight, CirclePlay, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format-date";
import { ProjectTagChips } from "@/modules/projects/components/project-tag-chips";
import { projectCredits } from "@/modules/projects/lib/project-payload";
import { youTubeThumbnailUrl } from "@/modules/projects/lib/youtube";
import type { ProjectTag, PublicProject } from "@/types/project";
import { ProjectRatingSummary } from "@/modules/projects/components/project-rating-summary";

// Asymmetric 7/5 split (markdown/design/DESIGN.md variance 6: "split panels, 60/40 grids …
// centered-form-in-a-void is banned"). The identity and the one action that
// matters sit left; the project's own image carries the right.
//
// The primary action is "Visit the live project", not the demo video: this
// page exists to send someone to the thing that was built. The video is a
// secondary jump link to the section further down, so the hero keeps one
// primary and one secondary control.
export function PublicProjectHero({
  project,
  catalog,
}: {
  project: PublicProject;
  catalog: ProjectTag[];
}) {
  const credits = projectCredits(project.meta);
  // A project without a cover photo still has a demo video, and YouTube's
  // thumbnail is a real image of the real project — a better right panel than
  // an empty placeholder tile.
  const image = project.photo?.url ?? youTubeThumbnailUrl(project.video_url);

  return (
    <section className="relative overflow-hidden border-b border-border bg-card">
      {/* One soft cobalt light source behind the image column. Static wash,
          no animation: the motion budget belongs to the scroll reveals. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-32 hidden size-[36rem] rounded-full bg-primary/5 blur-3xl lg:block"
      />

      <div className="relative mx-auto grid max-w-[1400px] gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-12 lg:gap-14 lg:px-10 lg:pb-20 lg:pt-14">
        <div className="flex flex-col justify-center lg:col-span-7">
          <ProjectTagChips tags={project.tags} catalog={catalog} className="mb-6" />
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            {project.name}
          </h1>
          {project.tagline && (
            <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground">
              {project.tagline}
            </p>
          )}

          {/* Links to the thread rather than repeating it: the rating is a
              summary, and the reviews are the content. */}
          <a
            href="#reviews"
            className="mt-5 inline-flex w-fit rounded-md py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ProjectRatingSummary subject={project} />
          </a>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              nativeButton={false}
              className="h-12 gap-2 px-6 text-base"
              render={
                <a href={project.project_url} target="_blank" rel="noreferrer noopener" />
              }
            >
              Visit the project
              <ArrowUpRight aria-hidden className="size-4" />
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              className="h-12 gap-2 px-6 text-base"
              render={<Link href="#demo" />}
            >
              <CirclePlay aria-hidden className="size-4" />
              Watch the demo
            </Button>
            {project.repository_url && (
              <Button
                variant="ghost"
                nativeButton={false}
                className="h-12 gap-2 px-4 text-base"
                render={
                  <a href={project.repository_url} target="_blank" rel="noreferrer noopener" />
                }
              >
                <GitBranch aria-hidden className="size-4" />
                Source
              </Button>
            )}
          </div>

          {/* Credit and date as one quiet line rather than a metadata strip.
              The public site carries no account identity, so whatever the team
              wrote about itself is the only attribution there is. */}
          <p className="mt-8 text-sm text-muted-foreground">
            {credits.team ? (
              <>
                Built by <span className="font-medium text-foreground">{credits.team}</span>
              </>
            ) : (
              // The project's own programme, never a hardcoded one — a
              // project may belong to a different event, or to none.
              `${project.egov_event?.name ?? "Showcase"} entry`
            )}
            <span aria-hidden className="mx-2 text-border">
              /
            </span>
            Published {formatDate(project.published_at, "dd MMM yyyy")}
          </p>
        </div>

        <div className="lg:col-span-5">
          {/* The panel hugs the image rather than forcing it into a ratio.
              Cover images arrive at whatever proportions the team uploaded, so
              a fixed box either crops them (the original `object-cover` bug)
              or pillarboxes a tall one in dead space. Letting the frame size
              itself means a wide screenshot fills the column, a tall one is
              centred at a capped height, and nothing is ever cut off. */}
          <div className="mx-auto flex w-fit items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/30 shadow-[0_24px_60px_-32px_var(--color-primary)]">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed CDN / YouTube URL, not configured for next/image
              <img
                src={image}
                alt={`${project.name} cover image`}
                fetchPriority="high"
                // Height cap keeps a portrait upload from towering over the
                // text column beside it.
                className="max-h-[460px] w-auto max-w-full object-contain"
              />
            ) : (
              // Branded panel rather than a grey box with an icon: cobalt
              // gradient under a fine white grid, the same treatment the
              // landing page uses for its brand surfaces (markdown/design/DESIGN.md §4).
              // Explicit width because the frame around it is `w-fit`: with no
              // image to size the panel, this has to bring its own.
              <div className="relative flex aspect-video w-[34rem] max-w-full items-center justify-center bg-gradient-to-br from-primary to-[#0c3ac0]">
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-[0.14]"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
                    backgroundSize: "36px 36px",
                  }}
                />
                <span className="relative px-8 text-center text-2xl font-semibold leading-tight tracking-tight text-white">
                  {project.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
