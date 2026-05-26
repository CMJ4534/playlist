import { getRemoteConfigSnapshot } from '@/config/remoteConfig';
import {
  initAnalytics,
  registerAnalyticsProvider,
  setAnalyticsProviders,
} from '@/services/analytics/analyticsService';
import { createBufferAnalyticsProvider } from '@/services/analytics/providers/bufferAnalyticsProvider';
import { createConsoleAnalyticsProvider } from '@/services/analytics/providers/consoleAnalyticsProvider';
import { createNoopAnalyticsProvider } from '@/services/analytics/providers/noopAnalyticsProvider';

/**
 * Remote config `analytics.provider` 기준 provider 스택 구성.
 * Mixpanel/Firebase는 createXProvider 구현 후 register.
 */
export function bootstrapAnalyticsProviders(options: {
  logToConsole?: boolean;
  bufferMaxSize?: number;
}): void {
  const remote = getRemoteConfigSnapshot();
  const providerKind = remote.analytics.provider;

  if (providerKind === 'none') {
    setAnalyticsProviders([createNoopAnalyticsProvider()]);
    return;
  }

  const stack = [createBufferAnalyticsProvider()];
  if (options.logToConsole ?? providerKind === 'buffer') {
    stack.push(createConsoleAnalyticsProvider());
  }

  if (providerKind === 'mixpanel' || providerKind === 'firebase') {
    // TODO: registerAnalyticsProvider(createMixpanelProvider(...))
    if (__DEV__) {
      console.info(
        `[analytics] provider "${providerKind}" not wired — using buffer only`
      );
    }
  }

  setAnalyticsProviders(stack);
  initAnalytics({
    enabled: true,
    bufferEvents: true,
    logToConsole: false,
    bufferMaxSize: options.bufferMaxSize,
  });
}

export { registerAnalyticsProvider };
