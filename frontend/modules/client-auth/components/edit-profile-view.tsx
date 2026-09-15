"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProfileForm } from "@/modules/client-auth/components/profile-form";
import { ProfilePhotoCard } from "@/modules/client-auth/components/profile-photo-card";
import type { ClientUserProfile } from "@/types/client-user";

// Details and photo are two independent saves against two endpoints with two
// separate cooldown clocks, so they are two cards rather than one form with
// one button — a single Save would imply they move together, and they don't.
export function EditProfileView({ profile }: { profile: ClientUserProfile }) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <ProfilePhotoCard profile={profile} />
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold tracking-tight">Your details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Name, birth date and address. These are what an administrator reviews when you apply
            as a developer.
          </p>
        </div>
        <ProfileForm
          profile={profile}
          // The two funnel states navigate on save: a draft account moves on
          // to the review page — a read-only preview with completing as the
          // only action — and a returned application goes back to the
          // dashboard, where the journey's Submit-again button is waiting.
          // Everyone else stays on the page — navigating away on save was
          // surprising (the photo card above saves in place), and refresh()
          // re-renders with the server's new state so a freshly-started
          // cooldown shows as the lock right away.
          onSuccess={() => {
            toast.success("Details saved");
            if (profile.status === "draft") {
              router.push("/dashboard/profile/review");
              return;
            }
            if (profile.status === "for_resubmission") {
              router.push("/dashboard");
              return;
            }
            router.refresh();
          }}
        />
      </section>
    </div>
  );
}
