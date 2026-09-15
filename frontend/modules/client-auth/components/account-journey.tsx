import type { ReactNode } from "react";
import Link from "next/link";
import { Check, Code2, FileClock, Star, UserRoundPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitApplicationButton } from "@/modules/client-auth/components/submit-application-button";
import { ApplicationsClosedNotice } from "@/modules/client-auth/components/applications-closed-notice";
import { parseRemarks } from "@/modules/client-auth/lib/account-status";
import { isFeatureEnabled } from "@/modules/feature-flags/lib/get-feature-flags";
import { cn } from "@/lib/utils";

// The early-lifecycle replacement for the flat status card: the account's
// three-step arc with the current step carrying the one action that belongs
// to it. Draft sees "complete your profile" as step 1 of 3 (progress, not a
// scolding); a completed account lands back here with step 1 ticked, rating
// and reviewing celebrated, and applying offered as optional; an application
// under review shows step 3 waiting in amber while step 2 stays usable; a
// returned application shows the reviewer's remarks on step 3 with editing
// and resubmitting as the live actions. Only approved, suspended and pending
// keep AccountStatePanel.
type JourneyStatus = "draft" | "completed" | "for_assessment" | "for_resubmission";

// "optional" renders like an upcoming step but undimmed and labeled Optional,
// with a quiet action — a real choice on offer, never the implied next task.
// "review" is the amber waiting state: somebody else's move, nothing to do.
type StepState = "done" | "current" | "upcoming" | "optional" | "review";

type Step = {
  state: StepState;
  description: string;
  // Rendered next to the step title, e.g. "Optional" or "Under review".
  chip?: { label: string; tone: "neutral" | "amber" };
  // The step's action(s), rendered under the description.
  action?: ReactNode;
};

const STEP_META = [
  { icon: UserRoundPen, title: "Complete your profile" },
  { icon: Star, title: "Rate & review projects" },
  { icon: Code2, title: "Become a developer" },
] as const;

const editProfileLink = (label: string, primary: boolean) => (
  <Button
    size="sm"
    variant={primary ? "default" : "outline"}
    nativeButton={false}
    render={<Link href="/dashboard/profile/edit" />}
  >
    {label}
  </Button>
);

const browseProjectsLink = (
  <div className="mt-3">
    <Button size="sm" nativeButton={false} render={<Link href="/projects" />}>
      Browse projects
    </Button>
  </div>
);

const STEP_CONTENT: Record<JourneyStatus, { heading: string; steps: Step[] }> = {
  draft: {
    heading: "Get started with your account",
    steps: [
      {
        state: "current",
        description:
          "Tell us who you are — your name, company and address. It takes about two minutes.",
        action: <div className="mt-3">{editProfileLink("Complete your profile", true)}</div>,
      },
      { state: "upcoming", description: "Unlocks the moment your profile is complete." },
      {
        state: "upcoming",
        description:
          "Apply for developer access to get API credentials and publish your own projects.",
      },
    ],
  },
  completed: {
    heading: "You're all set — start exploring projects",
    steps: [
      { state: "done", description: "Done — your details are saved." },
      {
        // The celebrated step, not a ticked box: this is what completing the
        // profile was FOR, and it needs nothing further.
        state: "current",
        description: "You can now rate, test and review every project on the showcase.",
        action: browseProjectsLink,
      },
      {
        // The Optional chip alone says it isn't required — the copy can just
        // sell what developer access offers. The details-lock caveat lives in
        // the apply button's confirm dialog, right before it matters.
        state: "optional",
        description:
          "Get API credentials and publish your own projects on the showcase — apply whenever you're ready.",
        chip: { label: "Optional", tone: "neutral" },
        action: (
          <div className="mt-3">
            {/* Primary-tinted outline: clearly clickable on this tinted
                card, still second to Browse projects. */}
            <SubmitApplicationButton
              isResubmission={false}
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
            />
          </div>
        ),
      },
    ],
  },
  for_assessment: {
    heading: "Your developer application is under review",
    steps: [
      { state: "done", description: "Done — your details are saved." },
      {
        // The wait shouldn't idle the account — rating and reviewing stays
        // fully available and is worth saying while they check back.
        state: "current",
        description: "Rate, test and review projects on the showcase while you wait.",
        action: browseProjectsLink,
      },
      {
        state: "review",
        description: "Your application is with the reviewers — we'll email you the outcome.",
        chip: { label: "Under review", tone: "amber" },
      },
    ],
  },
  for_resubmission: {
    heading: "Your application was returned — a few changes needed",
    steps: [
      {
        state: "done",
        description: "Saved — and free to edit while you address the reviewer's remarks.",
      },
      {
        state: "done",
        description: "Still yours — you can rate, test and review projects meanwhile.",
      },
      {
        // The live step: the remarks render right below (attached by the
        // component, since they come from the profile), then the fix→resubmit
        // pair. Editing leads; its save brings them straight back here, where
        // Submit again is waiting.
        state: "current",
        description:
          "A reviewer sent your application back. Address the remarks below, then submit it again.",
        chip: { label: "Changes requested", tone: "amber" },
        action: (
          <div className="mt-3 flex flex-wrap gap-2">
            {editProfileLink("Edit your details", true)}
            <SubmitApplicationButton
              isResubmission
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
            />
          </div>
        ),
      },
    ],
  },
};

// Step 3 while developer applications are switched off
// (the `developer_applications` feature flag). Every route to
// POST /profile/submit-for-assessment is refused, so the apply and resubmit
// buttons come off rather than being left to fail: the frontend switch exists
// precisely so nobody is offered a control the API would only refuse.
//
// Only the two states that can submit are overridden. `draft` never had a
// button on step 3, and `for_assessment` is already waiting on somebody else.
const CLOSED_STEP_THREE: Partial<Record<JourneyStatus, Step>> = {
  completed: {
    // Undimmed rather than "upcoming": developer access is still a real thing
    // this account can have, just not today — dimming it would read as a step
    // they haven't reached yet.
    state: "optional",
    // The step keeps selling what developer access is; the notice below says
    // why the button is gone. Splitting them keeps the closure from reading
    // as "this feature was removed".
    description:
      "Get API credentials and publish your own projects on the showcase.",
    // Amber, like "Under review": it is somebody else's move either way.
    chip: { label: "Closed for now", tone: "amber" },
    action: <ApplicationsClosedNotice className="mt-3" />,
  },
  for_resubmission: {
    // Stays "current" so the reviewer's remarks below still read as the live
    // thing on this account — the account IS mid-application, it simply
    // cannot be resubmitted yet.
    state: "current",
    description:
      "A reviewer sent your application back. You can still address the remarks below in the meantime.",
    chip: { label: "Closed for now", tone: "amber" },
    // Editing is NOT gated — only submitting is — so the one action that
    // still works stays, under the notice explaining what doesn't.
    action: (
      <>
        <ApplicationsClosedNotice className="mt-3" />
        <div className="mt-3">{editProfileLink("Edit your details", true)}</div>
      </>
    ),
  },
};

function StepChip({ chip }: { chip: NonNullable<Step["chip"]> }) {
  return (
    <span
      className={cn(
        "ml-2 rounded-full border px-2 py-0.5 text-xs font-medium",
        chip.tone === "amber"
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          : "border-border bg-background/70 text-muted-foreground",
      )}
    >
      {chip.label}
    </span>
  );
}

function StepBadge({ state, icon: Icon }: { state: StepState; icon: typeof Check }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full border",
        state === "current" && "border-primary bg-primary text-primary-foreground",
        state === "done" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        state === "review" &&
          "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        (state === "upcoming" || state === "optional") &&
          "border-border bg-background/70 text-muted-foreground",
      )}
    >
      {state === "done" ? (
        <Check className="size-4.5" />
      ) : state === "review" ? (
        <FileClock className="size-4.5" />
      ) : (
        <Icon className="size-4.5" />
      )}
    </span>
  );
}

export async function AccountJourney({
  status,
  remarks,
}: {
  status: JourneyStatus;
  // The account's assessment_remarks history; only the newest "[Returned …]"
  // entry is shown, on the returned state's step 3.
  remarks?: string | null;
}) {
  const { heading, steps: openSteps } = STEP_CONTENT[status];

  // Read here rather than passed in: this is a Server Component, and it only
  // ever renders below the dashboard's session read, so the subtree is already
  // dynamic (the trap CatalogReviews documents, which is why that one needs
  // connection() and this one does not).
  //
  // `developer_applications` is now a runtime flag rather than a frontend env
  // var (2026-09-02 handoff), so closing applications no longer needs a deploy
  // on this side at all.
  const applicationsOpen = await isFeatureEnabled("developer_applications");
  const closed = !applicationsOpen ? CLOSED_STEP_THREE[status] : undefined;
  const steps = closed ? [...openSteps.slice(0, 2), closed] : openSteps;

  const returned =
    status === "for_resubmission"
      ? parseRemarks(remarks).find((entry) => entry.tag === "Returned")
      : null;

  return (
    <section
      aria-labelledby="account-journey"
      className="rounded-xl border border-primary/20 bg-primary/5 p-6"
    >
      <h2 id="account-journey" className="text-base font-semibold tracking-tight">
        {heading}
      </h2>
      <ol className="mt-5 space-y-0">
        {STEP_META.map((meta, index) => {
          const step = steps[index];
          const isLast = index === STEP_META.length - 1;
          return (
            <li key={meta.title} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Connector down to the next step. */}
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-5 top-10 h-[calc(100%-2.5rem)] w-px bg-border"
                />
              )}
              <StepBadge state={step.state} icon={meta.icon} />
              <div className={cn("min-w-0 flex-1 pt-1", step.state === "upcoming" && "opacity-60")}>
                <p className="text-sm font-semibold">
                  <span className="text-muted-foreground">Step {index + 1} · </span>
                  {meta.title}
                  {step.chip && <StepChip chip={step.chip} />}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
                {isLast && returned && (
                  <div className="mt-3 rounded-lg border border-border bg-background/60 p-3">
                    <p className="text-xs font-medium">
                      What the reviewer asked for{returned.date ? ` · ${returned.date}` : ""}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{returned.body}</p>
                  </div>
                )}
                {step.action}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
