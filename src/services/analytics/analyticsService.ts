import { isDevEnvironment } from '@/constants/dev';

import type { AnalyticsEventName, AnalyticsEventPayload } from './analyticsEvents';
import { configureAnalyticsBuffer } from './analyticsBuffer';
import { createBufferAnalyticsProvider } from './providers/bufferAnalyticsProvider';
import { createConsoleAnalyticsProvider } from './providers/consoleAnalyticsProvider';
import { createNoopAnalyticsProvider } from './providers/noopAnalyticsProvider';
import type {
  AnalyticsConfig,
  AnalyticsEvent,
  AnalyticsProvider,
  AnalyticsUserTraits,
} from './types';

let appSessionId = `app_${Date.now()}`;
let providers: AnalyticsProvider[] = [];
let config: AnalyticsConfig = {
  enabled: true,
  logToConsole: isDevEnvironment(),
  bufferEvents: true,
  bufferMaxSize: 500,
};

function buildProviders(cfg: AnalyticsConfig): AnalyticsProvider[] {
  if (!cfg.enabled) return [createNoopAnalyticsProvider()];

  const list: AnalyticsProvider[] = [];
  if (cfg.bufferEvents) list.push(createBufferAnalyticsProvider());
  if (cfg.logToConsole) list.push(createConsoleAnalyticsProvider());
  if (!list.length) list.push(createNoopAnalyticsProvider());
  return list;
}

/**
 * 앱 시작 시 1회 — AppProviders에서 호출.
 */
export function initAnalytics(overrides?: Partial<AnalyticsConfig>): void {
  config = { ...config, ...overrides };
  configureAnalyticsBuffer(config.bufferMaxSize);
  providers = buildProviders(config);
  for (const p of providers) {
    p.init?.();
  }
}

export function setAnalyticsProviders(custom: AnalyticsProvider[]): void {
  providers = custom;
}

/** 추후 Mixpanel 등 단일 provider 주입 */
export function registerAnalyticsProvider(provider: AnalyticsProvider): void {
  providers = [...providers, provider];
}

export function getAppSessionId(): string {
  return appSessionId;
}

export function resetAppSessionId(): void {
  appSessionId = `app_${Date.now()}`;
}

export function identifyUser(userId: string, traits?: AnalyticsUserTraits): void {
  for (const p of providers) {
    p.identify?.(userId, traits);
  }
}

/**
 * 타입 안전 이벤트 전송 — 모든 recommendation/playback 계측의 단일 진입점.
 */
export function trackEvent<E extends AnalyticsEventName>(
  name: E,
  payload: AnalyticsEventPayload<E>
): void {
  if (!config.enabled) return;

  const event: AnalyticsEvent<E> = {
    name,
    payload,
    timestamp: Date.now(),
    sessionId: appSessionId,
  };

  for (const provider of providers) {
    try {
      provider.track(event);
    } catch (err) {
      if (config.logToConsole) {
        console.warn('[analytics] provider failed', provider.name, err);
      }
    }
  }
}

export async function flushAnalytics(): Promise<void> {
  await Promise.all(providers.map((p) => p.flush?.()));
}
