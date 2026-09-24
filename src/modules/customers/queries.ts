import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, profiles, roles, userRoles } from "@/db/schema";

const DEFAULT_CUSTOMER_PAGE_SIZE = 20;

export async function listCustomersForAdmin(params: { q?: string; page: number }) {
  const pageSize = DEFAULT_CUSTOMER_PAGE_SIZE;
  const conditions = [isNull(profiles.deletedAt)];

  if (params.q) {
    const like = `%${params.q}%`;
    conditions.push(sql`(${profiles.fullName} ilike ${like} or ${profiles.email} ilike ${like})`);
  }

  const where = and(...conditions);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(profiles)
    .where(where);

  const orderStats = db
    .select({
      profileId: orders.profileId,
      orderCount: sql<number>`count(*)::int`.as("order_count"),
      totalSpent: sql<string>`coalesce(sum(${orders.total}), 0)`.as("total_spent"),
    })
    .from(orders)
    .groupBy(orders.profileId)
    .as("order_stats");

  const items = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      phone: profiles.phone,
      createdAt: profiles.createdAt,
      orderCount: sql<number>`coalesce(${orderStats.orderCount}, 0)::int`,
      totalSpent: sql<string>`coalesce(${orderStats.totalSpent}, 0)`,
    })
    .from(profiles)
    .leftJoin(orderStats, eq(orderStats.profileId, profiles.id))
    .where(where)
    .orderBy(desc(profiles.createdAt))
    .limit(pageSize)
    .offset((params.page - 1) * pageSize);

  return {
    items,
    page: params.page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  };
}

export async function getCustomerForAdmin(profileId: string) {
  const profile = await db.query.profiles.findFirst({
    where: and(eq(profiles.id, profileId), isNull(profiles.deletedAt)),
    with: {
      addresses: { orderBy: (address, { asc }) => [asc(address.createdAt)] },
      orders: { orderBy: (order, { desc }) => [desc(order.createdAt)] },
    },
  });
  if (!profile) return null;

  const roleNames = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.profileId, profileId));

  return { ...profile, roles: roleNames.map((r) => r.name) };
}
