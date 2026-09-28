import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { coupons } from "@/db/schema";

export async function listCouponsForAdmin() {
  return db.query.coupons.findMany({
    orderBy: [desc(coupons.createdAt)],
    with: { usages: true },
  });
}

export async function getCouponForAdmin(id: string) {
  return db.query.coupons.findFirst({
    where: eq(coupons.id, id),
    with: { products: true, categories: true },
  });
}
