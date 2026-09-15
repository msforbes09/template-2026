import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireClientSession } from "@/lib/auth/dal";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { EditProfileBackLink } from "@/modules/client-auth/components/edit-profile-back-link";
import { EditProfileView } from "@/modules/client-auth/components/edit-profile-view";

export const metadata: Metadata = {
  title: "Edit profile",
  robots: { index: false, follow: false },
};

async function EditProfileSection() {
  await requireClientSession();
  const profile = await getClientProfile();

  if (!profile) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load your profile"
        description="Please try again in a moment."
      />
    );
  }

  // Deliberately NOT gated here on the cooldown or on suspension: the two
  // cards each know their own lock and say why, which is more useful than a
  // single page-level refusal that doesn't distinguish details from photo.
  //
  // The back link lives in here rather than at the page root because it needs
  // the status to know where "back" is, and the page root must stay free of
  // request-time data for PPR.
  return (
    <div className="space-y-6">
      <EditProfileBackLink status={profile.status} />
      {/* No mention of the 30-day rule here: each card's own dated notice
          explains it when it actually applies. */}
      <PageHeader title="Edit profile" description="Your photo and your details save separately." />
      <EditProfileView profile={profile} />
    </div>
  );
}

function EditProfileSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      {/* Matches the back link + heading now rendered inside the boundary. */}
      <div className="h-7 w-28 animate-pulse rounded bg-muted/60" />
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-full max-w-lg animate-pulse rounded bg-muted/60" />
      </div>
      <div className="h-40 animate-pulse rounded-xl bg-muted/50" />
      <div className="space-y-4 rounded-xl border border-border p-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-1.5">
            <div className="h-4 w-28 animate-pulse rounded bg-muted/70" />
            <div className="h-11 animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EditProfilePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      {/* The back link and the heading sit inside the boundary because the
          link's destination depends on the account's status — see
          EditProfileBackLink — and the page root stays free of request-time
          data for PPR. */}
      <Suspense fallback={<EditProfileSkeleton />}>
        <EditProfileSection />
      </Suspense>
    </div>
  );
}
