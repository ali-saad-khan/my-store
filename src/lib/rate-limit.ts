import "server-only";
import { and, count, eq, gte, lt } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db/client";
import { rateLimitAttempts } from "@/db/schema";

/**
 * A simple, serverless-safe fixed-window rate limiter — MasterPlan.txt section 17 ("rate
 * limiting where appropriate"). Self-prunes: every check deletes that key's attempts older
 * than the window before counting, so the table never grows unbounded without a cron job.
 * Not a precise sliding window, but good enough for abuse prevention on a handful of
 * actions — see DATABASE.md's Phase 15 scope note for which ones and why.
 */
export async function checkRateLimit(input: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<{ allowed: boolean }> {
  const windowStart = new Date(Date.now() - input.windowSeconds * 1000);

  await db
    .delete(rateLimitAttempts)
    .where(and(eq(rateLimitAttempts.key, input.key), lt(rateLimitAttempts.createdAt, windowStart)));

  const [row] = await db
    .select({ count: count() })
    .from(rateLimitAttempts)
    .where(and(eq(rateLimitAttempts.key, input.key), gte(rateLimitAttempts.createdAt, windowStart)));

  if ((row?.count ?? 0) >= input.limit) {
    return { allowed: false };
  }

  await db.insert(rateLimitAttempts).values({ key: input.key });
  return { allowed: true };
}

/** Best-effort client IP from the standard proxy headers Vercel sets — never trust it for authorization, only for rate-limit bucketing. */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headerList.get("x-real-ip") ?? "unknown";
}
