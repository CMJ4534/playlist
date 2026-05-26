import Constants from 'expo-constants';

import { resolveActiveRecommendationStrategy } from '@/constants/recommendationStrategy';
import { buildAnalyticsInsights } from '@/services/analytics/analyticsInsights';
import { buildOperationsMetrics } from '@/services/operations/operationsMetrics';
import { getAnalyticsEvents } from '@/services/analytics/analyticsBuffer';
import { useBetaDiagnosticsStore } from '@/stores/betaDiagnosticsStore';
import { usePlaybackHealthStore } from '@/stores/playbackHealthStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useRecommendationHistoryStore } from '@/stores/recommendationHistoryStore';
import { STORAGE_LIMITS } from '@/lib/storageMaintenance';

export type BetaDiagnosticsSnapshot = {
  appVersion: string;
  appEnv: string;
  recommendationSource: string;
  recommendationStrategy: string;
  analyticsBufferCount: number;
  playbackFailTracked: number;
  playbackFailBlocked: number;
  lastFallbackReason: string | null;
  lastFallbackAt: string | null;
  queuePersistSize: number;
  historyRecentCount: number;
  exposureMapSize: number;
  storageLimits: typeof STORAGE_LIMITS;
};

export function getBetaDiagnosticsSnapshot(): BetaDiagnosticsSnapshot {
  const health = usePlaybackHealthStore.getState().getFailureStats();
  const beta = useBetaDiagnosticsStore.getState();
  const history = useRecommendationHistoryStore.getState();
  const queue = usePlayerStore.getState().queue;

  return {
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
    appEnv:
      process.env.EXPO_PUBLIC_APP_ENV ??
      process.env.APP_ENV ??
      'development',
    recommendationSource:
      process.env.EXPO_PUBLIC_RECOMMENDATION_SOURCE ?? 'mock',
    recommendationStrategy: resolveActiveRecommendationStrategy(),
    analyticsBufferCount: getAnalyticsEvents().length,
    playbackFailTracked: health.tracked,
    playbackFailBlocked: health.blocked,
    lastFallbackReason: beta.lastFallbackReason,
    lastFallbackAt:
      beta.lastFallbackAt ?
        new Date(beta.lastFallbackAt).toISOString()
      : null,
    queuePersistSize: queue.length,
    historyRecentCount: history.recentYoutubeIds.length,
    exposureMapSize: Object.keys(history.exposureCountByYoutubeId).length,
    storageLimits: STORAGE_LIMITS,
  };
}

export function buildAnalyticsExportBundle(): Record<string, unknown> {
  return {
    exportedAt: new Date().toISOString(),
    diagnostics: getBetaDiagnosticsSnapshot(),
    insights: buildAnalyticsInsights(),
    operations: buildOperationsMetrics(),
    events: getAnalyticsEvents(),
    playbackHealth: usePlaybackHealthStore.getState().byYoutubeId,
  };
}
