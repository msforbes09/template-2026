import type { ProjectStatus } from "@/types/project";

// `status` and `is_published` are independent (types/project.ts): the first
// says where the working copy is in review, the second whether a snapshot is
// live. Neither alone tells the owner what's going on — "draft" reads as
// "nothing is public" when it can equally mean "your last published version
// is still up and these edits are waiting". This maps the pair to the one
// label that's true of both, per the handoff's table.

export type ProjectStatusTone =
  // No public presence, owner still editing.
  | "draft"
  // Sitting in a queue someone else has to act on.
  | "review"
  // Bounced back — the owner has to do something.
  | "changes"
  // Live to the public.
  | "live";

export type ProjectStatusLabel = {
  label: string;
  tone: ProjectStatusTone;
  // One sentence the owner can act on. Admin screens show the same pair but
  // pair it with the claim/publish controls instead.
  description: string;
  // True whenever a snapshot is live — the label already says so, but list
  // rows also want it as a plain flag (e.g. to show the public link).
  isLive: boolean;
};

// `· live` suffixes exist because a project can be in any review state while
// an older snapshot is still public; the review state alone would imply the
// public page is down, which it isn't.
export function projectStatusLabel(
  status: ProjectStatus,
  isPublished: 0 | 1,
): ProjectStatusLabel {
  const isLive = isPublished === 1;

  switch (status) {
    case "draft":
      return isLive
        ? {
            label: "Draft · Live",
            tone: "live",
            description:
              "Your published version is still public. Submit these edits for review to replace it.",
            isLive,
          }
        : {
            label: "Draft",
            tone: "draft",
            description: "Only you can see this. Submit it for review when you're ready.",
            isLive,
          };
    case "for_assessment":
      return {
        label: isLive ? "For Review · Live" : "For Review",
        tone: "review",
        description: isLive
          ? "Your changes are with the reviewers. The published version stays public until they publish the new one."
          : "Your project is with the reviewers. You'll be notified once it's assessed.",
        isLive,
      };
    case "for_resubmission":
      return {
        label: isLive ? "Needs Changes · Live" : "Needs Changes",
        tone: "changes",
        description: isLive
          ? "A reviewer sent your changes back. The published version stays public in the meantime."
          : "A reviewer sent this back. Address the remarks below, then submit it again.",
        isLive,
      };
    case "for_publishing":
      return {
        label: isLive ? "Ready to Publish · Live" : "Ready to Publish",
        tone: "review",
        description: isLive
          ? "Reviewed and queued. The published version stays public until an administrator publishes the new one."
          : "Reviewed and queued for an administrator to publish.",
        isLive,
      };
    case "published":
      // Approved but hidden. `toggle-publish` flips is_published on its own
      // and never moves status, so this pair is a normal state now — an
      // administrator has taken a live project down without un-approving it.
      return isLive
        ? {
            label: "Live",
            tone: "live",
            description: "This project is public on the showcase.",
            isLive,
          }
        : {
            label: "Hidden",
            tone: "draft",
            description:
              "An administrator has taken this project off the public showcase. It stays approved, and can be put back at any time.",
            isLive,
          };
  }
}

// Only these two lanes let the owner submit (POST /projects/{uuid}/submit);
// anything else answers 400 invalid_status, so the button isn't offered.
export function canSubmitProject(status: ProjectStatus): boolean {
  return status === "draft" || status === "for_resubmission";
}

// The owner can always edit, but editing a live project silently resets the
// working copy to `draft` — worth warning about before they start.
export function editResetsReview(status: ProjectStatus, isPublished: 0 | 1): boolean {
  return isPublished === 1 || status === "for_assessment" || status === "for_publishing";
}

// Neither audience renders a status FILTER any more: the admin sidebar shows
// queues (admin-project-menu.ts) and the citizen list shows badges alone. The
// label lists that used to live here are gone rather than kept unused — a
// second copy of this vocabulary is how two screens start disagreeing.

// A claim means "an administrator is working on this", and it now locks the
// owner out: PUT and DELETE answer 400 project_under_assessment while it is
// held. The controls are disabled on the flag rather than left to fail, so
// nobody loses an edit they had already typed.
//
// Claims are released automatically after 12 hours of inactivity, so this
// resolves itself without anyone intervening — which is worth saying, since
// an unexplained lock reads as a bug.
export function isLockedByAssessment(project: {
  is_assessment_started?: 0 | 1;
}): boolean {
  return project.is_assessment_started === 1;
}

export const ASSESSMENT_LOCK_MESSAGE =
  "An administrator is reviewing this project, so it can't be edited right now. Reviews are released automatically if they go untouched for 12 hours.";

// Admin claiming is allowed on these three only. `draft` and
// `for_resubmission` belong to the citizen — claiming one answers
// 400 invalid_status, and admins cannot edit or delete them at all.
export function isClaimable(status: ProjectStatus): boolean {
  return status === "for_assessment" || status === "for_publishing" || status === "published";
}

// Which timestamp the admin list's single adaptive column shows (the
// console-wide one-timestamp-per-menu rule): the Published submenu answers
// "when did this go live", every other view answers "when was this touched".
export function listTimestampColumn(
  status: string,
): { header: "Published"; field: "published_at" } | { header: "Updated"; field: "updated_at" } {
  return status === "published"
    ? { header: "Published", field: "published_at" }
    : { header: "Updated", field: "updated_at" };
}
