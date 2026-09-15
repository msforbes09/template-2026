import { CircleCheck, Gauge, Radio } from "lucide-react";
import {
  MAX_RAW_SCORE,
  MINIMUM_TOTAL_SCORE,
  REQUIRE_LIVE_DEMONSTRATION,
  REQUIRE_VERIFIED_API_INTEGRATION,
  totalWeight,
} from "@/modules/hackathon/lib/criteria";

// The three conditions that decide whether an entry is in contention at all,
// placed above the criteria because they are pass/fail: a project can score
// well on four criteria and still not qualify.
export function QualifyingRules() {
  const gates = [
    {
      icon: Gauge,
      title: `Score at least ${MINIMUM_TOTAL_SCORE} out of ${totalWeight()}`,
      body: `Each criterion is marked out of ${MAX_RAW_SCORE} and weighted into a single score. Anything below ${MINIMUM_TOTAL_SCORE} does not qualify, however strong one area is.`,
      show: true,
    },
    {
      icon: CircleCheck,
      title: "Verified eGov API integration",
      body: "A judge has to see the integration actually working — real authentication, real requests and responses, as part of the system's workflow.",
      show: REQUIRE_VERIFIED_API_INTEGRATION,
    },
    {
      icon: Radio,
      title: "A live demonstration",
      body: "The system is shown running, end to end. Slides, screenshots, mockups and recorded demos do not count for this.",
      show: REQUIRE_LIVE_DEMONSTRATION,
    },
  ].filter((gate) => gate.show);

  return (
    <ul className="grid gap-4 sm:grid-cols-3">
      {gates.map((gate) => (
        <li key={gate.title} className="rounded-xl border border-border bg-card p-6">
          <span
            aria-hidden
            className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <gate.icon className="size-5" />
          </span>
          <h3 className="mt-4 text-sm font-semibold tracking-tight">{gate.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{gate.body}</p>
        </li>
      ))}
    </ul>
  );
}
