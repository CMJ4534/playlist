import type { AnalyticsEventName } from '../analyticsEvents';
import type { AnalyticsEvent, AnalyticsProvider } from '../types';

/** 프로덕션에서 analytics 비활성 시 */
export function createNoopAnalyticsProvider(): AnalyticsProvider {
  return {
    name: 'noop',
    track<E extends AnalyticsEventName>(_event: AnalyticsEvent<E>) {},
  };
}
