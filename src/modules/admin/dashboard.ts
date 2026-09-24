import "server-only";
import { eq, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { inventory, orderItems, orders, payments, roles, userRoles } from "@/db/schema";

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

export async function getRecentOrders(limit = 8) {
  return db.query.orders.findMany({
    with: { profile: true },
    orderBy: (order, { desc }) => [desc(order.createdAt)],
    limit,
  });
}
