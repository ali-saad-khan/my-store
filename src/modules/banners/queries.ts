import "server-only";
import { asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { banners } from "@/db/schema";

/** Active banners for the storefront hero slider, in admin-chosen display order. Cached —
 * see the note on `getFeaturedProducts`; invalidated via `revalidateTag` from the banner
 * admin actions. */
export const getActiveBanners = unstable_cache(
  async () =>
    db
      .select()
      .from(banners)
      .where(eq(banners.isActive, true))
      .orderBy(asc(banners.sortOrder), asc(banners.createdAt)),
  ["active-banners"],
  { tags: ["banners"], revalidate: 60 },
);

export async function listBannersForAdmin() {
  return db.select().from(banners).orderBy(asc(banners.sortOrder), asc(banners.createdAt));
}

export async function getBannerByIdForAdmin(id: string) {
  const [banner] = await db.select().from(banners).where(eq(banners.id, id)).limit(1);
  return banner ?? null;
}
