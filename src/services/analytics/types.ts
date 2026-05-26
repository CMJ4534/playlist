import type { AnalyticsEventMap, AnalyticsEventName } from './analyticsEvents';

export type AnalyticsEvent<E extends AnalyticsEventName = AnalyticsEventName> = {
  name: E;
  payload: AnalyticsEventMap[E];
  timestamp: number;
  sessionId: string;
};

export type AnalyticsUserTraits = {
  appEnv?: string;
  recommendationSource?: string;
};

/**
 * 추후 Firebase / Mixpanel / Amplitude 구현체가 따르는 인터페이스.
 */
export interface AnalyticsProvider {
  readonly name: string;
  init?(): void | Promise<void>;
  identify?(userId: string, traits?: AnalyticsUserTraits): void;
  track<E extends AnalyticsEventName>(
    event: AnalyticsEvent<E>
  ): void | Promise<void>;
  flush?(): void | Promise<void>;
}

export type AnalyticsConfig = {
  enabled: boolean;
  /** __DEV__ 에서 콘솔 출력 */
  logToConsole: boolean;
  /** 로컬 링 버퍼 (인사이트·DEV) */
  bufferEvents: boolean;
  bufferMaxSize: number;
};
