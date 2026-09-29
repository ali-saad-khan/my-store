import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Backs `src/lib/rate-limit.ts`. A plain DB table rather than in-memory or Redis: this app
 * deploys to Vercel's serverless functions, which don't share process memory across
 * invocations, so an in-memory limiter would silently do nothing in production — see
 * DATABASE.md's Phase 15 scope note.
 */
export const rateLimitAttempts = pgTable(
  "rate_limit_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(), // e.g. "coupon_apply:1.2.3.4"
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("rate_limit_attempts_key_created_at_idx").on(table.key, table.createdAt)],
);
