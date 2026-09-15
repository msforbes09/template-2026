import { describe, expect, it } from "vitest";
import { replySchema, reviewSchema } from "@/modules/reviews/schemas/review-schema";

const VALID = { rating: 5, comment: "Clean UX and a real demo.", is_anonymous: false };

describe("reviewSchema", () => {
  it("accepts a complete review", () => {
    expect(reviewSchema.safeParse(VALID).success).toBe(true);
  });

  it("accepts a rating with no comment, since the comment is optional", () => {
    expect(reviewSchema.safeParse({ ...VALID, comment: "" }).success).toBe(true);
  });

  it("requires a rating inside the 1-5 scale", () => {
    expect(reviewSchema.safeParse({ ...VALID, rating: 0 }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...VALID, rating: 6 }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...VALID, rating: 2.5 }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...VALID, rating: undefined }).success).toBe(false);
  });

  it("enforces the backend's 5,000 character cap", () => {
    expect(reviewSchema.safeParse({ ...VALID, comment: "x".repeat(5000) }).success).toBe(true);
    expect(reviewSchema.safeParse({ ...VALID, comment: "x".repeat(5001) }).success).toBe(false);
  });
});

describe("replySchema", () => {
  it("requires something to say", () => {
    expect(replySchema.safeParse({ comment: "" }).success).toBe(false);
    expect(replySchema.safeParse({ comment: "   " }).success).toBe(false);
    expect(replySchema.safeParse({ comment: "Thanks!" }).success).toBe(true);
  });

  it("enforces the backend's 2,000 character cap", () => {
    expect(replySchema.safeParse({ comment: "x".repeat(2000) }).success).toBe(true);
    expect(replySchema.safeParse({ comment: "x".repeat(2001) }).success).toBe(false);
  });
});
