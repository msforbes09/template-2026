import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  FolderGit2,
  Images,
  ShieldCheck,
  Star,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

// "Project showcase" — what the Projects feature is, for a visitor who has not
// signed in and has no way to discover it otherwise.
//
// It sits directly above HackathonShowcase, which renders REAL published
// entries and renders nothing at all until there are some. That is the split:
// this section explains the capability and is always here; that one is the
// evidence and comes and goes. Neither repeats the other's job.
//
// Static and session-free by design — every claim below is true of the feature
// regardless of who is looking, so there is nothing to fetch, no Suspense, and
// it stays in the prerendered shell.
//
// Every statement here is taken from the implementation, not written for
// effect: the field list is ProjectContent (types/project.ts), the filters are
// the ones PublicProjectsFilters actually offers, the lifecycle is
// project-status.ts, and the developer gate is the one MyProjectsList enforces.

const POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Images,
    title: "One entry holds the whole story.",
    body: "A cover image, a tagline and a full write-up, plus a demo video and links to the running project and its repository — so people can read it, watch it, then go and use it.",
  },
  {
    icon: Blocks,
    title: "Tagged with the services behind it.",
    body: "Every entry names the eGov APIs it integrates and the stack it was built on. Visitors filter the showcase by either, which is how somebody looking for a working eVerify integration finds yours.",
  },
  {
    icon: ShieldCheck,
    title: "Reviewed before it goes public.",
    body: "Submit a draft and an administrator assesses it, sends it back with remarks, or publishes it. Editing a published entry never takes it down — the live version stays up until the replacement is published.",
  },
];

// The mock entry below is decorative: the real cards are in the section under
// this one. It is aria-hidden so a screen reader is never read an invented
// project as though it were a real one.
const MOCK_APIS = ["egov-sso", "everify", "emessage"];

export function ProjectShowcase() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div
        id="showcase"
        className="relative mx-auto w-full max-w-[1600px] scroll-mt-24 px-6 sm:px-9 lg:px-16"
      >
        <div className="pointer-events-none absolute left-6 top-0 hidden h-full w-px bg-border sm:left-9 md:block lg:left-16" />
        <div className="pointer-events-none absolute right-6 top-0 hidden h-full w-px bg-border sm:right-9 md:block lg:right-16" />

        <div className="relative border-x border-border">
          <Reveal className="grid gap-8 border-y border-border px-6 pb-16 pt-16 sm:px-8 md:grid-cols-[1fr_0.72fr] md:items-end lg:px-16 lg:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.04em] text-primary">
                <FolderGit2 aria-hidden className="size-4" />
                Project showcase
              </div>
              <h2 className="max-w-[640px] text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Build it on these APIs, then{" "}
                <span className="text-primary">show it.</span>
              </h2>
            </div>
            <p className="max-w-[430px] text-base leading-7 text-muted-foreground md:justify-self-end">
              Developer accounts get more than credentials. Publish what you
              built on the eGov APIs to a public showcase anyone can browse — no
              account needed to read it.
            </p>
          </Reveal>

          <div className="grid border-b border-border lg:grid-cols-[1fr_0.8fr]">
            <div className="flex flex-col divide-y divide-border border-b border-border lg:border-b-0 lg:border-r">
              {POINTS.map((point, index) => (
                <Reveal
                  key={point.title}
                  className="px-6 py-10 sm:px-8 lg:px-16 lg:py-12"
                  delay={0.06 + index * 0.06}
                >
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <point.icon aria-hidden className="size-5" />
                  </span>
                  <h3 className="mt-5 text-2xl font-semibold leading-tight tracking-tight text-foreground">
                    {point.title}
                  </h3>
                  <p className="mt-3 max-w-[520px] text-sm leading-6 text-muted-foreground">
                    {point.body}
                  </p>
                </Reveal>
              ))}
            </div>

            {/* A miniature of PublicProjectCard, so the anatomy described on
                the left is something the reader can actually look at. */}
            <Reveal
              className="flex items-center justify-center bg-muted/30 px-6 py-12 sm:px-8 lg:px-12"
              delay={0.18}
            >
              <div
                aria-hidden
                className="w-full max-w-[340px] overflow-hidden rounded-xl border border-border bg-card shadow-[0_22px_55px_rgba(15,23,42,0.08)]"
              >
                <div className="flex aspect-[16/9] items-center justify-center bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklch,var(--primary)_28%,transparent),transparent_60%),linear-gradient(135deg,color-mix(in_oklch,var(--primary)_16%,transparent),transparent)]">
                  <FolderGit2 className="size-8 text-primary/40" />
                </div>
                <div className="flex flex-col gap-3 p-5">
                  <span className="inline-flex w-fit rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    TOP 30
                  </span>
                  <h4 className="text-base font-semibold leading-snug tracking-tight text-foreground">
                    Barangay Clearance Kiosk
                  </h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Walk-in clearance requests verified against PhilSys and
                    released in under two minutes.
                  </p>
                  <ul className="flex flex-wrap gap-1 pt-2">
                    {MOCK_APIS.map((api) => (
                      <li
                        key={api}
                        className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px] text-secondary-foreground"
                      >
                        {api}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Next.js · Laravel · PostgreSQL
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Published 12 Aug 2026
                    </p>
                    <span className="flex items-center gap-0.5">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <Star
                          key={index}
                          className={
                            index < 4
                              ? "size-3 fill-primary text-primary"
                              : "size-3 text-muted-foreground/30"
                          }
                        />
                      ))}
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal className="grid items-center gap-6 px-6 py-14 sm:px-8 md:grid-cols-[1fr_auto] lg:px-16 lg:py-16">
            <div>
              <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
                Entering a project needs a developer account.
              </p>
              <p className="mt-2 max-w-[620px] text-base leading-7 text-muted-foreground">
                Anyone can browse the showcase. Publishing to it comes with the
                same approval that issues your API credentials, so every entry
                belongs to a vetted organization.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                nativeButton={false}
                className="h-12 gap-2 px-6"
                render={<Link href="/projects" />}
              >
                Browse the showcase
                <ArrowRight aria-hidden className="size-4" />
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                className="h-12 gap-2 px-6"
                render={<Link href="/#access" />}
              >
                How access works
              </Button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
