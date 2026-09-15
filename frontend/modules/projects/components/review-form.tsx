"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AppFormField } from "@/components/ui/app-form-field";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormRootError } from "@/components/ui/form-root-error";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { applyResultErrors } from "@/lib/apply-result-errors";
import { StarRatingInput } from "@/modules/reviews/components/star-rating-input";
import {
  createReview,
  deleteReview,
  updateReview,
} from "@/modules/projects/actions/review-actions";
import {
  reviewSchema,
  REVIEW_FIELDS,
  type ReviewFormValues,
} from "@/modules/reviews/schemas/review-schema";
import { REVIEW_COMMENT_MAX, type ProjectReview } from "@/types/project";
import { useResetOnHide } from "@/hooks/use-reset-on-hide";

// One form for both verbs. The review is a singleton per user per project, so
// whether this creates or replaces is decided entirely by whether one already
// exists — and if the two ever disagree (a review written in another tab), the
// API says so with `review_already_exists` and the form switches rather than
// showing the user a dead end.
export function ReviewForm({
  projectUuid,
  review,
}: {
  projectUuid: string;
  review: ProjectReview | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(!review);
  // Set when the API says this account owns the project. There is no cheap way
  // to know that up front on a public page — the public resource carries no
  // owner, and probing an owner-only endpoint would 404 for every other signed
  // -in visitor, which apiFetch reports to Slack. So the form asks once, by
  // being submitted, and then stops offering itself.
  const [ownProject, setOwnProject] = useState(false);
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: review?.rating ?? 0,
      comment: review?.comment ?? "",
      is_anonymous: review?.is_anonymous === 1,
    },
  });

  // Re-seeded when the route is hidden; `editing` goes back to its opening
  // state with it. `ownProject` deliberately does NOT — it is a fact this
  // component learned from the API, not user input, and forgetting it would
  // re-offer a review form to someone who cannot post one.
  useResetOnHide(() => {
    form.reset();
    setEditing(!review);
  });

  async function onSubmit(values: ReviewFormValues) {
    const result = review
      ? await updateReview(projectUuid, values)
      : await createReview(projectUuid, values);

    if (result.ok) {
      // Re-baselined to what was just saved, not blanked: after a create this
      // component becomes the edit view of that same review, so the values on
      // screen are correct — what has to go is the dirty flag, or the form
      // keeps claiming unsaved changes it no longer has. This page stays
      // mounted (router.refresh, no navigation), so nothing else clears it.
      form.reset(values);
      setEditing(false);
      router.refresh();
      toast.success(review ? "Review updated" : "Thanks for your review");
      return;
    }

    // The account already has a review here — another tab, or a page that went
    // stale. Refreshing pulls the existing one in and this re-renders as an
    // edit. Keyed on the error code, not the 400, which several failures share.
    if (result.code === "review_already_exists") {
      router.refresh();
      toast.info("You've already reviewed this project. Loading your review.");
      return;
    }
    if (result.code === "cannot_review_own_project") {
      setOwnProject(true);
      return;
    }
    // The gate above normally prevents this, but a profile that changed in
    // another tab can still land here.
    if (result.code === "profile_incomplete") {
      toast.error("Complete your profile before posting a review.");
      return;
    }
    if (result.code === "account_suspended") {
      toast.error("Your account is suspended, so you can't post reviews.");
      return;
    }
    applyResultErrors(form, result, REVIEW_FIELDS);
  }

  if (ownProject) {
    return (
      <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        This is your project, so you can&apos;t review it. You can reply to reviews from your
        project page in the dashboard.
      </p>
    );
  }

  if (review && !editing) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit your review
        </Button>
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="sm" className="text-destructive">
              Delete
            </Button>
          }
          title="Delete your review?"
          description="It disappears from the public thread, along with any replies underneath it."
          confirmLabel="Delete"
          destructive
          onConfirm={async () => {
            const result = await deleteReview(projectUuid);
            if (result.ok) {
              router.refresh();
              toast.success("Review deleted");
            } else {
              toast.error(result.message);
            }
          }}
        />
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={(event) => {
          void form.handleSubmit(onSubmit)(event);
        }}
        className="space-y-5"
        noValidate
      >
        <Controller
          control={form.control}
          name="rating"
          render={({ field }) => (
            <AppFormField label="Your rating" isRequired error={form.formState.errors.rating?.message}>
              <StarRatingInput value={field.value} onChange={field.onChange} />
            </AppFormField>
          )}
        />
        <AppFormField
          label="Your review"
          userInfo={`Optional. What worked, what you'd change. Up to ${REVIEW_COMMENT_MAX.toLocaleString()} characters.`}
          error={form.formState.errors.comment?.message}
        >
          <Textarea rows={4} placeholder="What stood out about this project?" {...form.register("comment")} />
        </AppFormField>
        <Controller
          control={form.control}
          name="is_anonymous"
          render={({ field }) => (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">Post anonymously</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your name is hidden on the public page. Administrators can still see who wrote it.
                </p>
              </div>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-label="Post anonymously"
              />
            </div>
          )}
        />
        <FormRootError />
        <div className="flex flex-wrap gap-2">
          <FormSubmitButton>{review ? "Save changes" : "Post review"}</FormSubmitButton>
          {review && (
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
