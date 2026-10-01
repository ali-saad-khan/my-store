import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { homepageSections } from "@/db/schema";
import type { HomepageSectionKey } from "@/validations/homepage";

export async function setSectionVisibility(key: HomepageSectionKey, isVisible: boolean) {
  await db
    .update(homepageSections)
    .set({ isVisible, updatedAt: new Date() })
    .where(eq(homepageSections.key, key));
}

export async function updateSectionContent(key: HomepageSectionKey, content: Record<string, unknown>) {
  await db
    .update(homepageSections)
    .set({ content, updatedAt: new Date() })
    .where(eq(homepageSections.key, key));
}
