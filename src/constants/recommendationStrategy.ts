import type {
  PlaylistGenerationMeta,
  RecommendationStrategyId,
  StrategyVersion,
} from '@/types/recommendationStrategy';
import type { EmotionId } from '@/types/emotion';
import type { PlaylistDiversityScore } from '@/lib/recommendationDiversity';

import { getActiveRecommendationStrategyId } from '@/config/recommendationRollout';
import { getAppSessionId } from '@/services/analytics/analyticsService';

/** 빌드타임 기본값 (remote config 미로드 시) */
export const DEFAULT_RECOMMENDATION_STRATEGY: RecommendationStrategyId =
  (process.env.EXPO_PUBLIC_RECOMMENDATION_STRATEGY as RecommendationStrategyId) ??
  'v1_curated_arc';

/** @deprecated — resolveActiveRecommendationStrategy() 사용 */
export const ACTIVE_RECOMMENDATION_STRATEGY = DEFAULT_RECOMMENDATION_STRATEGY;

export function resolveActiveRecommendationStrategy(): RecommendationStrategyId {
  try {
    return getActiveRecommendationStrategyId(getAppSessionId());
  } catch {
    return DEFAULT_RECOMMENDATION_STRATEGY;
  }
}

export const RECOMMENDATION_STRATEGY_VERSION: StrategyVersion = '1.0.0';

const STRATEGY_LABELS: Record<RecommendationStrategyId, string> = {
  v1_curated_arc: 'Energy arc + mood continuity',
  v2_diverse_wave: 'High diversity wave (reserved)',
  v3_low_energy_focus: 'Low energy focus (reserved)',
};

export function getStrategyLabel(id: RecommendationStrategyId): string {
  return STRATEGY_LABELS[id] ?? id;
}

export function buildPlaylistGenerationMeta(
  emotionId: EmotionId,
  trackCount: number,
  diversityScore?: PlaylistDiversityScore
): PlaylistGenerationMeta {
  return {
    strategyId: resolveActiveRecommendationStrategy(),
    strategyVersion: RECOMMENDATION_STRATEGY_VERSION,
    emotionId,
    trackCount,
    generatedAt: Date.now(),
    diversityScore,
    experimentVariant: resolveActiveRecommendationStrategy(),
  };
}
