import { z } from "zod";
import { REVIEW_COMMENT_MAX, REVIEW_REPLY_MAX } from "@/types/project";

// Mirrors the backend's FormRequests so a bad review fails in the form rather
// than round-tripping to a 422: rating 1-5 required, comment optional and
// capped at 5,000, reply required and capped at 2,000.
export const reviewSchema = z.object({
  rating: z
    .number({ message: "Select a rating" })
    .int()
    .min(1, "Select a rating")
    .max(5, "Select a rating"),
  comment: z
    .string()
    .trim()
    .max(REVIEW_COMMENT_MAX, `Keep your review under ${REVIEW_COMMENT_MAX.toLocaleString()} characters`),
  is_anonymous: z.boolean(),
});

export type ReviewFormValues = z.infer<typeof reviewSchema>;

export const replySchema = z.object({
  comment: z
    .string()
    .trim()
    .min(1, "Write a reply first")
    .max(REVIEW_REPLY_MAX, `Keep your reply under ${REVIEW_REPLY_MAX.toLocaleString()} characters`),
});

export type ReplyFormValues = z.infer<typeof replySchema>;

export const REVIEW_FIELDS = ["rating", "comment", "is_anonymous"] as const;
