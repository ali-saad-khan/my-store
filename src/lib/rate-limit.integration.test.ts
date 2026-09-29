import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { rateLimitAttempts } from "@/db/schema";
import { checkRateLimit } from "./rate-limit";

/**
 * `checkRateLimit` always writes through the global `db` (it's meant to run standalone in
 * a Server Action, not composed into a caller's transaction), so this test can't use
 * `withRollback` — it cleans up its own throwaway key directly instead.
 */
describe("checkRateLimit (integration, self-cleaning)", () => {
  it("allows requests up to the limit, then blocks", async () => {
    const key = `test-rate-limit:${crypto.randomUUID()}`;
    try {
      for (let i = 0; i < 3; i++) {
        const result = await checkRateLimit({ key, limit: 3, windowSeconds: 60 });
        expect(result.allowed).toBe(true);
      }

      const blocked = await checkRateLimit({ key, limit: 3, windowSeconds: 60 });
      expect(blocked.allowed).toBe(false);
    } finally {
      await db.delete(rateLimitAttempts).where(eq(rateLimitAttempts.key, key));
    }
  });

  it("prunes attempts older than the window, so an expired key resets", async () => {
    const key = `test-rate-limit:${crypto.randomUUID()}`;
    try {
      await db.insert(rateLimitAttempts).values({
        key,
        createdAt: new Date(Date.now() - 120_000), // 2 minutes ago
      });

      // Window is 60s — that old attempt should be pruned and not count.
      const result = await checkRateLimit({ key, limit: 1, windowSeconds: 60 });
      expect(result.allowed).toBe(true);
    } finally {
      await db.delete(rateLimitAttempts).where(eq(rateLimitAttempts.key, key));
    }
  });
});
