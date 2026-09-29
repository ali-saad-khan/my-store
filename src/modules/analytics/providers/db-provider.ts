import "server-only";
import { db } from "@/db/client";
import { analyticsEvents } from "@/db/schema";
import type { AnalyticsEventInput, AnalyticsProvider } from "../provider";

/**
 * The default (and, for now, only) provider — self-hosted, no third-party analytics
 * vendor credentials exist for this project. A future PostHog/Segment/GA4 provider would
 * plug in here behind the same `AnalyticsProvider` interface, selected by
 * `getAnalyticsProvider()` in `../track.ts` the same way email picks Resend vs. the
 * console fallback — but it isn't written until there's a real account to test it against
 * (MasterPlan.txt section 35: never claim an integration works without testing it).
 */
export function createDbAnalyticsProvider(): AnalyticsProvider {
  return {
    async track(input: AnalyticsEventInput) {
      await db.insert(analyticsEvents).values({
        eventName: input.eventName,
        profileId: input.profileId,
        properties: input.properties,
      });
    },
  };
}
