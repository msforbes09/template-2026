"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppFormField } from "@/components/ui/app-form-field";
import { CooldownNotice } from "@/modules/client-auth/components/cooldown-notice";
import { FileUploader } from "@/modules/uploads/components/file-uploader";
import { updateProfilePhoto } from "@/modules/client-auth/actions/profile-actions";
import { uploadClientPrivateFile } from "@/modules/uploads/actions/upload-actions";
import { photoCooldown } from "@/modules/client-auth/lib/account";
import type { ClientUserProfile } from "@/types/client-user";
import type { UploadedFile } from "@/types/upload";

// The photo is its own card because it is its own endpoint with its own
// 30-day clock: PUT /profile ignores photo_uuid entirely, and PATCH
// /profile/photo runs on a separate cooldown from the details.
//
// Setting a photo when none is attached is always allowed, even inside a
// cooldown window — so an account that never uploaded one is never stuck.
export function ProfilePhotoCard({ profile }: { profile: ClientUserProfile }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [photo, setPhoto] = useState<UploadedFile | null>(
    profile.photo?.uuid
      ? {
          uuid: profile.photo.uuid,
          url: profile.photo.url ?? "",
          original_name: profile.photo.original_name ?? "Current photo",
          mime_type: profile.photo.mime_type ?? "image/*",
          size: profile.photo.size ?? 0,
        }
      : null,
  );

  const cooldown = photoCooldown(profile);
  const hasNoPhoto = !profile.photo?.uuid;
  // The lock does not apply to a first upload.
  const locked = cooldown.locked && !hasNoPhoto;

  function save(file: UploadedFile | null) {
    setPhoto(file);
    if (!file) return;
    startTransition(async () => {
      const result = await updateProfilePhoto(file.uuid);
      if (result.ok) {
        router.refresh();
        toast.success("Photo updated");
        return;
      }
      if (result.code === "profile_change_cooldown") {
        const next = result.meta?.next_change_at;
        toast.error(
          typeof next === "string"
            ? `You can change your photo again on ${next}.`
            : result.message,
        );
        return;
      }
      toast.error(result.message);
    });
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Photo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasNoPhoto
            ? "Add a clear, well-lit photo of your face."
            : "Your profile photo, shown to administrators reviewing your account."}
        </p>
      </div>

      {locked ? (
        <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
          {profile.photo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed CDN URL, not configured for next/image
            <img
              src={profile.photo.url}
              alt="Your profile photo"
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <div className="size-16 rounded-full bg-muted" />
          )}
          {/* Nothing to say here — the dated notice under this card is the
              one explanation. */}
        </div>
      ) : (
        <AppFormField label="Photo">
          <FileUploader
            visibility="private"
            value={photo}
            onChange={save}
            uploadAction={uploadClientPrivateFile}
            captureOnly
            hint={isPending ? "Saving…" : "Use a clear, well-lit photo of your face."}
          />
        </AppFormField>
      )}

      {!hasNoPhoto && <CooldownNotice cooldown={cooldown} what="photo" />}
    </section>
  );
}
