export type AnalyticsEventInput = {
  eventName: string;
  profileId: string | null;
  properties: Record<string, unknown>;
};

export interface AnalyticsProvider {
  track(input: AnalyticsEventInput): Promise<void>;
}
