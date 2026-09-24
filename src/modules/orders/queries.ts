import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { getCurrentUser, getUserRoles } from "@/modules/auth/session";

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
