import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireClientSession } from "@/lib/auth/dal";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { ProfileReview } from "@/modules/client-auth/components/profile-review";

export const metadata: Metadata = {
  title: "Review your profile",
  robots: { index: false, follow: false },
};

async function ReviewProfileSection() {
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

  // Review is a step of the draft completion funnel and nothing else — once
  // the profile is completed (or for any other status) the profile page is
  // the place to be.
  if (profile.status !== "draft") redirect("/dashboard/profile");

  return <ProfileReview profile={profile} />;
}

function ReviewProfileSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="h-32 animate-pulse rounded-xl bg-muted/50" />
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="space-y-3 rounded-xl border border-border p-6">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-8 animate-pulse rounded bg-muted/60" />
            <div className="h-8 animate-pulse rounded bg-muted/60" />
          </div>
        </div>
      ))}
      <div className="h-28 animate-pulse rounded-xl bg-muted/50" />
    </div>
  );
}

export default function ReviewProfilePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <Link
        href="/dashboard/profile/edit"
        className="group -ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft
          aria-hidden
          className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
        />
        Edit profile
      </Link>
      <PageHeader
        title="Review your profile"
        description="Check that everything below is right, then complete your profile."
      />
      <Suspense fallback={<ReviewProfileSkeleton />}>
        <ReviewProfileSection />
      </Suspense>
    </div>
  );
}
