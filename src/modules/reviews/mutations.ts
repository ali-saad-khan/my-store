import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { reviews } from "@/db/schema";
import { findVerifyingOrderItem } from "./queries";
import type { ReviewStatus } from "./status";

export class ReviewNotFoundError extends Error {
  constructor() {
    super("Review not found.");
    this.name = "ReviewNotFoundError";
  }
}

/**
 * Creates or updates the customer's one review for this product (see the
 * partial unique index on reviews(profile_id, product_id)). Editing an
 * existing review resets it to "pending" — moderation applies to the
 * current content, not just the first submission.
 */
export async function upsertReview(input: {
  profileId: string;
  productId: string;
  rating: number;
  title?: string;
  body?: string;
}) {
  const orderItemId = await findVerifyingOrderItem(input.profileId, input.productId);

  const [review] = await db
    .insert(reviews)
    .values({
      productId: input.productId,
      profileId: input.profileId,
      orderItemId,
      rating: input.rating,
      title: input.title,
      body: input.body,
      status: "pending",
    })
    .onConflictDoUpdate({
      target: [reviews.profileId, reviews.productId],
      targetWhere: sql`${reviews.deletedAt} IS NULL`,
      set: {
        rating: input.rating,
        title: input.title,
        body: input.body,
        orderItemId,
        status: "pending",
        updatedAt: new Date(),
      },
    })
    .returning();

  return review;
}

export async function deleteReviewAsCustomer(id: string, profileId: string) {
  const [deleted] = await db
    .update(reviews)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(reviews.id, id), eq(reviews.profileId, profileId)))
    .returning();
  if (!deleted) throw new ReviewNotFoundError();
  return deleted;
}

export async function moderateReview(id: string, status: Extract<ReviewStatus, "approved" | "rejected">) {
  const [review] = await db
    .update(reviews)
    .set({ status, updatedAt: new Date() })
    .where(eq(reviews.id, id))
    .returning();
  if (!review) throw new ReviewNotFoundError();
  return review;
}
