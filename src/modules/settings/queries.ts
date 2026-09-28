import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { settings } from "@/db/schema";

/**
 * Reads one admin-editable setting (see Phase 1's key/value `settings` table).
 * There's no admin UI for writing settings yet (deliberately deferred — see
 * DATABASE.md's Phase 8 scope note); this only reads what's already seeded.
 */
export async function getSettingValue<T>(key: string): Promise<T | null> {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, key));
  return (row?.value as T) ?? null;
}
