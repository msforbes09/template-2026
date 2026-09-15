import Link from "next/link";
import { Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitApplicationButton } from "@/modules/client-auth/components/submit-application-button";
import { ApplicationsClosedNotice } from "@/modules/client-auth/components/applications-closed-notice";
import {
  accountStatus,
  canApplyAsDeveloper,
  isSuspended,
} from "@/modules/client-auth/lib/account";
import { isFeatureEnabled } from "@/modules/feature-flags/lib/get-feature-flags";
import type { ClientUserProfile } from "@/types/client-user";

// Shown where a basic account lands on something only a developer can use —
// their projects and their API access.
//
// Without this the pages lie by omission: GET user/projects returns an EMPTY
// LIST for a basic account rather than an error, so the screen reads "you
// haven't entered a project yet" next to a create button the API would refuse.
// And `credits` is simply absent, so the developer page renders as though the
// allowance were zero.
//
// The message names the actual next step, which depends on where the account
// is: finish the profile, apply, wait, or fix what was sent back.
export async function DeveloperOnlyNotice({
  profile,
  what,
}: {
  profile: ClientUserProfile;
  // What they were trying to reach, so one component serves both pages
  // without a generic "this feature".
  what: string;
}) {
  const status = accountStatus(profile.status);

  if (isSuspended(profile)) {
    return (
      <EmptyState
        icon={Code2}
        title={`${what} isn't available while your account is suspended`}
        description="You can still sign in and read your data. An administrator can tell you more."
        action={
          <Button variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
            Back to dashboard
          </Button>
        }
      />
    );
  }

  if (status === "for_assessment") {
    return (
      <EmptyState
        icon={Code2}
        title="Your developer application is being reviewed"
        description={`${what} unlocks once it's approved. We'll email you either way.`}
        action={
          <Button variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
            Back to dashboard
          </Button>
        }
      />
    );
  }

  // `completed` and `for_resubmission` can apply from here directly, which
  // saves a trip back to the dashboard to press the same button.
  if (canApplyAsDeveloper(profile)) {
    // …unless applications are switched off, in which case
    // submit-for-assessment is refused and the button would only fail. Safe to
    // read here without connection(): every caller of this component already
    // awaited the session and the profile, so the subtree is dynamic.
    const applicationsClosed = !(await isFeatureEnabled("developer_applications"));

    // The whole reason this branch exists is to offer the apply button. With
    // applications off there is nothing to offer, so the notice carries the
    // explanation and the page keeps only a way back — the placeholder must
    // not read as "this page is broken".
    if (applicationsClosed) {
      return (
        <EmptyState
          icon={Code2}
          title={`${what} needs a developer account`}
          action={
            <div className="flex w-full max-w-lg flex-col items-center gap-4">
              <ApplicationsClosedNotice />
              <Button variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
                Back to dashboard
              </Button>
            </div>
          }
        />
      );
    }

    return (
      <EmptyState
        icon={Code2}
        title={`${what} needs a developer account`}
        description={
          status === "for_resubmission"
            ? "Your last application was sent back with remarks. Address them on your dashboard, then submit it again."
            : "Apply as a developer to get API credentials and enter projects into the showcase. An administrator reviews each application."
        }
        action={
          status === "for_resubmission" ? (
            <Button variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
              See the remarks
            </Button>
          ) : (
            <SubmitApplicationButton isResubmission={false} />
          )
        }
      />
    );
  }

  // Draft, or anything unrecognised: completing the profile is the gate.
  return (
    <EmptyState
      icon={Code2}
      title={`${what} needs a developer account`}
      description="Complete your profile first, then you can apply as a developer to get API credentials and enter projects."
      action={
        <Button variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
          Finish your profile
        </Button>
      }
    />
  );
}
