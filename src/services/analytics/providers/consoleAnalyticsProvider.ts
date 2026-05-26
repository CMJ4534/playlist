import type { AnalyticsEventName } from '../analyticsEvents';
import type { AnalyticsEvent, AnalyticsProvider } from '../types';

export function createConsoleAnalyticsProvider(): AnalyticsProvider {
  return {
    name: 'console',
    track<E extends AnalyticsEventName>(event: AnalyticsEvent<E>) {
      console.info(
        `[analytics] ${event.name}`,
        event.payload,
        { ts: event.timestamp, session: event.sessionId }
      );
    },
  };
}
