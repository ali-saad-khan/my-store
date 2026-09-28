import "server-only";
import { and, avg, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { orderItems, orders, reviews } from "@/db/schema";
import type { ReviewStatus } from "./status";

const DEFAULT_REVIEW_PAGE_SIZE = 10;

export async function getReviewSummaryForProduct(productId: string) {
  const [row] = await db
    .select({ count: count(reviews.id), average: avg(reviews.rating) })
    .from(reviews)
    .where(
      and(eq(reviews.productId, productId), eq(reviews.status, "approved"), isNull(reviews.deletedAt)),
    );

  return { count: row?.count ?? 0, average: row?.average ? Number(row.average) : null };
}

export async function listApprovedReviewsForProduct(productId: string, page = 1) {
  const pageSize = DEFAULT_REVIEW_PAGE_SIZE;
  const where = and(
    eq(reviews.productId, productId),
    eq(reviews.status, "approved"),
    isNull(reviews.deletedAt),
  );

  const [{ count: total }] = await db.select({ count: count() }).from(reviews).where(where);

  const items = await db.query.reviews.findMany({
    where,
    with: { profile: true },
    orderBy: [desc(reviews.createdAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getOwnReviewForProduct(profileId: string, productId: string) {
  return db.query.reviews.findFirst({
    where: and(
      eq(reviews.profileId, profileId),
      eq(reviews.productId, productId),
      isNull(reviews.deletedAt),
    ),
  });
}

/** Whether this profile has a delivered order containing this product — earns the review a "verified purchase" link. */
export async function findVerifyingOrderItem(profileId: string, productId: string) {
  const [row] = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        eq(orders.profileId, profileId),
        eq(orders.status, "delivered"),
        eq(orderItems.productId, productId),
      ),
    )
    .limit(1);

  return row?.id ?? null;
}

export async function listReviewsForAdmin(params: { status?: ReviewStatus; page: number }) {
  const pageSize = DEFAULT_REVIEW_PAGE_SIZE;
  const conditions = [isNull(reviews.deletedAt)];
  if (params.status) conditions.push(eq(reviews.status, params.status));
  const where = and(...conditions);

  const [{ count: total }] = await db.select({ count: count() }).from(reviews).where(where);

  const items = await db.query.reviews.findMany({
    where,
    with: { profile: true, product: true },
    orderBy: [desc(reviews.createdAt)],
    limit: pageSize,
    offset: (params.page - 1) * pageSize,
  });

  return {
    items,
    page: params.page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
