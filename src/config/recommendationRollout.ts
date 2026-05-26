import { getRemoteConfigSnapshot } from '@/config/remoteConfig';
import type { RecommendationStrategyId } from '@/types/recommendationStrategy';

/** 기기별 안정적 버킷 (0–99) */
function deviceRolloutBucket(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 100;
}

/**
 * 활성 추천 전략 — env < remote config rollout.
 * analytics `strategyId`·generationMeta와 동일 소스 사용.
 */
export function getActiveRecommendationStrategyId(
  deviceSeed = 'anonymous'
): RecommendationStrategyId {
  const remote = getRemoteConfigSnapshot();
  const defaultStrategy = remote.recommendation.defaultStrategy;
  const percent = remote.recommendation.strategyRolloutPercent ?? 100;

  if (percent >= 100) return defaultStrategy;

  const bucket = deviceRolloutBucket(deviceSeed);
  if (bucket < percent) return defaultStrategy;

  const alt = remote.recommendation.allowedStrategies.find(
    (s) => s !== defaultStrategy
  );
  return alt ?? defaultStrategy;
}
