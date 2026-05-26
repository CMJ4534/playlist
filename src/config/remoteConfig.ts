import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RecommendationStrategyId } from '@/types/recommendationStrategy';

const CACHE_KEY = 'moodplay-remote-config-v1';

/** 서버·Firebase Remote Config 등과 1:1 매핑 가능한 스키마 */
export type RemoteConfigSnapshot = {
  version: number;
  fetchedAt: number;
  flags: {
    enablePlaylistFeedbackPrompt: boolean;
    enableLikeSave: boolean;
    enableBetaQa: boolean;
    enablePlaybackDebug: boolean;
  };
  recommendation: {
    defaultStrategy: RecommendationStrategyId;
    /** 0–100 — deviceId hash 기반 rollout */
    strategyRolloutPercent: number;
    allowedStrategies: RecommendationStrategyId[];
  };
  analytics: {
    provider: 'buffer' | 'mixpanel' | 'firebase' | 'none';
  };
};

export const DEFAULT_REMOTE_CONFIG: RemoteConfigSnapshot = {
  version: 1,
  fetchedAt: 0,
  flags: {
    enablePlaylistFeedbackPrompt: true,
    enableLikeSave: true,
    enableBetaQa: process.env.EXPO_PUBLIC_BETA_QA === '1',
    enablePlaybackDebug: process.env.EXPO_PUBLIC_PLAYBACK_DEBUG === '1',
  },
  recommendation: {
    defaultStrategy:
      (process.env.EXPO_PUBLIC_RECOMMENDATION_STRATEGY as RecommendationStrategyId) ??
      'v1_curated_arc',
    strategyRolloutPercent: 100,
    allowedStrategies: ['v1_curated_arc', 'v2_diverse_wave', 'v3_low_energy_focus'],
  },
  analytics: {
    provider: 'buffer',
  },
};

let memoryConfig: RemoteConfigSnapshot = { ...DEFAULT_REMOTE_CONFIG };

export function getRemoteConfigSnapshot(): RemoteConfigSnapshot {
  return memoryConfig;
}

export async function loadRemoteConfigFromCache(): Promise<RemoteConfigSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return memoryConfig;
    const parsed = JSON.parse(raw) as RemoteConfigSnapshot;
    memoryConfig = mergeRemoteConfig(parsed);
    return memoryConfig;
  } catch {
    return memoryConfig;
  }
}

/** 추후 GET /config 또는 Supabase edge config */
export async function fetchRemoteConfig(_url?: string): Promise<RemoteConfigSnapshot> {
  const merged = mergeRemoteConfig(DEFAULT_REMOTE_CONFIG);
  merged.fetchedAt = Date.now();
  memoryConfig = merged;
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(memoryConfig));
  return memoryConfig;
}

export function applyRemoteConfigOverride(
  partial: Partial<RemoteConfigSnapshot>
): void {
  memoryConfig = mergeRemoteConfig({ ...memoryConfig, ...partial });
}

function mergeRemoteConfig(
  incoming: Partial<RemoteConfigSnapshot>
): RemoteConfigSnapshot {
  return {
    ...DEFAULT_REMOTE_CONFIG,
    ...incoming,
    flags: { ...DEFAULT_REMOTE_CONFIG.flags, ...incoming.flags },
    recommendation: {
      ...DEFAULT_REMOTE_CONFIG.recommendation,
      ...incoming.recommendation,
    },
    analytics: {
      ...DEFAULT_REMOTE_CONFIG.analytics,
      ...incoming.analytics,
    },
  };
}
