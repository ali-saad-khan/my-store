import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { homepageSections } from "@/db/schema";
import type { HomepageSectionKey } from "@/validations/homepage";

export type HomepageSection = {
  key: HomepageSectionKey;
  isVisible: boolean;
  content: Record<string, unknown>;
};

/**
 * Cached — see the note on products' getFeaturedProducts; invalidated via
 * `updateTag("homepage-sections")` from the admin homepage actions. Returns a plain
 * object (not a Map) keyed by section — `unstable_cache` persists its result through
 * JSON, which a Map doesn't survive.
 */
export const getHomepageSections = unstable_cache(
  async () => {
    const rows = await db.select().from(homepageSections);
    return Object.fromEntries(rows.map((row) => [row.key, row])) as Partial<
      Record<HomepageSectionKey, HomepageSection>
    >;
  },
  ["homepage-sections"],
  { tags: ["homepage-sections"], revalidate: 60 },
);

/** Admin list view — always fresh, not cached (an admin editing settings must see current state). */
export async function listHomepageSectionsForAdmin() {
  const rows = await db.select().from(homepageSections).orderBy(homepageSections.key);
  return rows as HomepageSection[];
}
