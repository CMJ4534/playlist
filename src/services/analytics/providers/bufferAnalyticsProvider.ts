import type { AnalyticsEventName } from '../analyticsEvents';
import { pushAnalyticsEvent } from '../analyticsBuffer';
import type { AnalyticsEvent, AnalyticsProvider } from '../types';

export function createBufferAnalyticsProvider(): AnalyticsProvider {
  return {
    name: 'buffer',
    track<E extends AnalyticsEventName>(event: AnalyticsEvent<E>) {
      pushAnalyticsEvent(event);
    },
  };
}
