import { Markdown } from "@/components/ui/markdown";
import { Reveal } from "@/components/ui/reveal";
import { PublicProjectRail } from "@/modules/projects/components/public-project-rail";
import { YouTubeEmbed } from "@/modules/projects/components/youtube-embed";
import type { PublicProject } from "@/types/project";

// The read: demo first, then the write-up, with the scannable facts parked in
// a rail beside them (8/4 of a 12-column grid). The old page ran photo, video,
// links, prose, tech, APIs and team down one narrow column in that order, so
// the two media blocks sat back to back and every fact hid behind the prose.
export function PublicProjectBody({ project }: { project: PublicProject }) {
  return (
    <div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-10 lg:py-20">
      <div className="space-y-14 lg:col-span-8">
        {/* scroll-mt clears the sticky site header when the hero's "Watch the
            demo" button jumps here. */}
        <section id="demo" aria-labelledby="demo-heading" className="scroll-mt-24">
          <Reveal>
            <h2 id="demo-heading" className="text-2xl font-semibold tracking-tight">
              Demo
            </h2>
            <div className="mt-5">
              <YouTubeEmbed url={project.video_url} title={project.name} />
            </div>
          </Reveal>
        </section>

        {/* Deliberately NOT wrapped in Reveal. A scroll-triggered fade fires
            at 20% visibility, so on a long write-up the whole block sits at
            opacity 0 until the reader is already inside it, then pops. This is
            the page's actual content: it renders at full opacity, always. The
            one reveal above is motivated (it draws the eye to the demo); a
            second one here would be decoration on the thing people came for. */}
        <section aria-labelledby="about-heading">
          <h2 id="about-heading" className="text-2xl font-semibold tracking-tight">
            About this project
          </h2>
          {/* Bumped off the component's compact chat defaults to a long-read
              scale; 68ch keeps the measure readable at this column width. */}
          <Markdown className="mt-5 max-w-[68ch] text-base leading-relaxed text-foreground/85">
            {project.description}
          </Markdown>
        </section>
      </div>

      <PublicProjectRail project={project} />
    </div>
  );
}
