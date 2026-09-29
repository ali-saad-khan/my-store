import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { banners } from "@/db/schema";
import type { BannerInput } from "@/validations/banner";

export class BannerNotFoundError extends Error {
  constructor() {
    super("Banner not found.");
    this.name = "BannerNotFoundError";
  }
}

export async function createBanner(input: BannerInput & { imageUrl: string }) {
  const [banner] = await db.insert(banners).values(input).returning();
  return banner;
}

export async function updateBanner(id: string, input: BannerInput) {
  const [banner] = await db
    .update(banners)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(banners.id, id))
    .returning();
  if (!banner) throw new BannerNotFoundError();
  return banner;
}

export async function deleteBanner(id: string) {
  const [banner] = await db.delete(banners).where(eq(banners.id, id)).returning();
  if (!banner) throw new BannerNotFoundError();
  return banner;
}
