import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { getCurrentUser, getUserRoles } from "@/modules/auth/session";
import type { OrderStatus } from "./status";

const DEFAULT_ORDER_PAGE_SIZE = 20;

/**
 * A signed-in shopper can only view their own orders (or an admin, any).
 * A guest order has no owning profile — its `orderNumber` (32 bits of
 * randomness) works as a bearer link for the confirmation page, the same
 * pattern most guest checkouts use for a "thank you" / order-status page.
 */
export async function getOrderByNumberForViewer(orderNumber: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.orderNumber, orderNumber),
    with: {
      items: true,
      addresses: true,
      payments: { with: { transactions: true } },
      paymentMethod: true,
      coupon: true,
      profile: true,
      statusHistory: { orderBy: (row, { asc }) => [asc(row.createdAt)] },
    },
  });
  if (!order) return null;

  if (order.profileId) {
    const user = await getCurrentUser();
    if (!user) return null;
    if (user.id !== order.profileId) {
      const roles = await getUserRoles(user.id);
      if (!roles.includes("admin")) return null;
    }
  }

  return order;
}

export async function listOrdersForProfile(profileId: string, page = 1) {
  const pageSize = DEFAULT_ORDER_PAGE_SIZE;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(eq(orders.profileId, profileId));

  const items = await db.query.orders.findMany({
    where: eq(orders.profileId, profileId),
    with: { items: true },
    orderBy: [desc(orders.createdAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    items,
    page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  };
}

export async function getOrderForAdmin(orderNumber: string) {
  return db.query.orders.findFirst({
    where: eq(orders.orderNumber, orderNumber),
    with: {
      items: true,
      addresses: true,
      payments: { with: { transactions: true } },
      paymentMethod: true,
      profile: true,
      coupon: true,
      statusHistory: { orderBy: (row, { asc }) => [asc(row.createdAt)] },
    },
  });
}

export async function listOrdersForAdmin(params: {
  q?: string;
  status?: OrderStatus;
  page: number;
}) {
  const pageSize = DEFAULT_ORDER_PAGE_SIZE;
  const conditions = [];

  if (params.q) {
    const like = `%${params.q}%`;
    conditions.push(
      sql`(${orders.orderNumber} ilike ${like} or ${orders.guestEmail} ilike ${like})`,
    );
  }
  if (params.status) conditions.push(eq(orders.status, params.status));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(where);

  const items = await db.query.orders.findMany({
    where,
    with: { profile: true },
    orderBy: [desc(orders.createdAt)],
    limit: pageSize,
    offset: (params.page - 1) * pageSize,
  });

  return {
    items,
    page: params.page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  };
}
