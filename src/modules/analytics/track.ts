import "server-only";
import type { AnalyticsEventMap, AnalyticsEventName } from "./events";
import type { AnalyticsProvider } from "./provider";
import { createDbAnalyticsProvider } from "./providers/db-provider";

let cachedProvider: AnalyticsProvider | null = null;

function getAnalyticsProvider(): AnalyticsProvider {
  cachedProvider ??= createDbAnalyticsProvider();
  return cachedProvider;
}

/**
 * Fire-and-forget: never throws back into the caller. A dropped analytics event must
 * never break checkout, cart, or any other business flow — see MasterPlan.txt section 25
 * ("do not place analytics code throughout business logic unnecessarily") and the same
 * resilience contract `sendTransactionalEmail` follows in `modules/notifications`.
 */
export async function track<E extends AnalyticsEventName>(
  eventName: E,
  properties: AnalyticsEventMap[E],
  context?: { profileId?: string | null },
): Promise<void> {
  try {
    await getAnalyticsProvider().track({
      eventName,
      profileId: context?.profileId ?? null,
      properties,
    });
  } catch (error) {
    console.error(`[analytics] Failed to track "${eventName}":`, error);
  }
}
