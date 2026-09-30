import "server-only";
import { and, eq, gte, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { inventory, orderItems, orders, payments, roles, userRoles } from "@/db/schema";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function getDashboardStats() {
  const [
    [{ revenue }],
    [{ orderCount }],
    [{ customerCount }],
    [{ productsSold }],
    [{ lowStockCount }],
    [{ pendingOrderCount }],
  ] = await Promise.all([
    db
      .select({ revenue: sql<string>`coalesce(sum(${orders.total}), 0)` })
      .from(orders)
      .innerJoin(payments, eq(payments.orderId, orders.id))
      .where(eq(payments.status, "paid")),
    db.select({ orderCount: sql<number>`count(*)::int` }).from(orders),
    db
      .select({ customerCount: sql<number>`count(distinct ${userRoles.profileId})::int` })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(roles.name, "customer")),
    db
      .select({ productsSold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(ne(orders.status, "cancelled")),
    db
      .select({ lowStockCount: sql<number>`count(*)::int` })
      .from(inventory)
      .where(
        sql`(${inventory.quantityOnHand} - ${inventory.quantityReserved}) <= ${inventory.reorderPoint}`,
      ),
    db
      .select({ pendingOrderCount: sql<number>`count(*)::int` })
      .from(orders)
      .where(eq(orders.status, "pending")),
  ]);

  return { revenue, orderCount, customerCount, productsSold, lowStockCount, pendingOrderCount };
}

/**
 * Period-over-period revenue/order deltas for the dashboard's two trended stat cards
 * (the other four stats stay as plain current-value cards — no historical comparison
 * needed for those, keeps this reasonably scoped).
 */
export async function getPeriodComparison(days = 30) {
  const periodStart = daysAgo(days);
  const priorPeriodStart = daysAgo(days * 2);

  const [[current], [previous]] = await Promise.all([
    db
      .select({
        revenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
        orderCount: sql<number>`count(distinct ${orders.id})::int`,
      })
      .from(orders)
      .innerJoin(payments, eq(payments.orderId, orders.id))
      .where(and(eq(payments.status, "paid"), gte(orders.placedAt, periodStart))),
    db
      .select({
        revenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
        orderCount: sql<number>`count(distinct ${orders.id})::int`,
      })
      .from(orders)
      .innerJoin(payments, eq(payments.orderId, orders.id))
      .where(
        and(
          eq(payments.status, "paid"),
          gte(orders.placedAt, priorPeriodStart),
          lt(orders.placedAt, periodStart),
        ),
      ),
  ]);

  return { current, previous };
}

/** Daily revenue for the last `days` days (paid orders only), zero-filled for empty days. */
export async function getRevenueTrend(days = 30) {
  const periodStart = daysAgo(days - 1);

  const rows = await db
    .select({
      date: sql<string>`date_trunc('day', ${orders.placedAt})::date`,
      revenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
    })
    .from(orders)
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .where(and(eq(payments.status, "paid"), gte(orders.placedAt, periodStart)))
    .groupBy(sql`date_trunc('day', ${orders.placedAt})`)
    .orderBy(sql`date_trunc('day', ${orders.placedAt})`);

  const byDate = new Map(rows.map((row) => [row.date, Number(row.revenue)]));

  return Array.from({ length: days }, (_, i) => {
    const date = new Date(periodStart.getTime() + i * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    return { date: key, revenue: byDate.get(key) ?? 0 };
  });
}

export async function getRecentOrders(limit = 8) {
  return db.query.orders.findMany({
    with: { profile: true },
    orderBy: (order, { desc }) => [desc(order.createdAt)],
    limit,
  });
}
