import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CriteriaList } from "@/modules/hackathon/components/criteria-list";
import { QualifyingRules } from "@/modules/hackathon/components/qualifying-rules";
import {
  MAX_RAW_SCORE,
  MINIMUM_TOTAL_SCORE,
  totalWeight,
} from "@/modules/hackathon/lib/criteria";

const TITLE = "eGov Hackathon 2026 judging criteria";
const DESCRIPTION =
  "How entries to the eGov Hackathon 2026 are scored: six weighted criteria out of 100, the minimum score to qualify, and the two requirements every entry has to meet.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/egov-hackathon-2026-criteria" },
  openGraph: {
    type: "article",
    url: "/egov-hackathon-2026-criteria",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// Entirely static: the judging rules are published configuration, transcribed
// from the official scoring workbook, so this page has no dynamic hole in it
// and prerenders in full.
export default function CriteriaPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-20 sm:px-6 lg:px-10">
      <header className="max-w-3xl py-14 lg:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          eGov Hackathon 2026
        </p>
        <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          How entries are <span className="text-primary">judged</span>
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          Every entry is scored against six criteria, weighted to a total of {totalWeight()}.
          Two of them are requirements rather than preferences: miss either and the entry does
          not qualify, whatever else it scores.
        </p>
      </header>

      <section aria-labelledby="qualifying" className="border-t border-border py-12 lg:py-16">
        <h2 id="qualifying" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          What it takes to qualify
        </h2>
        <div className="mt-8">
          <QualifyingRules />
        </div>
      </section>

      <section aria-labelledby="criteria" className="border-t border-border py-12 lg:py-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="criteria" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              The six criteria
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Each is marked out of {MAX_RAW_SCORE}, then weighted. The weight is how much of the
              final {totalWeight()} that criterion is worth.
            </p>
          </div>
        </div>
        <div className="mt-8">
          <CriteriaList />
        </div>
      </section>

      <section
        aria-labelledby="scoring"
        className="border-t border-border py-12 lg:py-16"
      >
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 id="scoring" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              How the score is worked out
            </h2>
          </div>
          <div className="space-y-4 text-base leading-relaxed text-muted-foreground lg:col-span-7">
            <p>
              A judge marks each criterion from 0 to {MAX_RAW_SCORE}. Each mark is multiplied by
              that criterion&apos;s weight and the six are added together, giving a score out of{" "}
              {totalWeight()}.
            </p>
            <p>
              Each criterion also carries a minimum mark of its own. The two required criteria set
              theirs higher, so an entry cannot pass by scoring well everywhere else and skipping
              the integration or the live demonstration.
            </p>
            <p>
              An entry qualifies when it clears {MINIMUM_TOTAL_SCORE}
              {" "}overall, meets every criterion&apos;s minimum, and satisfies both requirements
              above.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-8 sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              See what has been <span className="text-primary">built</span>
            </h2>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
              Published entries, with the services each one connects to and a demo you can watch.
            </p>
          </div>
          <Button
            nativeButton={false}
            className="h-12 shrink-0 gap-2 px-6"
            render={<Link href="/projects" />}
          >
            Browse the projects
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
